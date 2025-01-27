import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from "@libs/llm";
import { ScraperService } from "@libs/scraper";
import { OcrService } from "@libs/ocr";
import { PoolInfo } from '@libs/db/schemas/pool-info.schema';
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {DailySwimSchedule} from "@libs/db/schemas/daily-swim-schedule.schema";
import {SeoulPoolInfo} from "@libs/db/schemas/seoul-pool-info.schema";

@Injectable()
export class EtlService {
    private readonly logger = new Logger(EtlService.name);

    constructor(
        private readonly llmService: LlmService,
        private readonly scraperService: ScraperService,
        private readonly ocrService: OcrService,

        @InjectModel(PoolInfo.name)
        private readonly poolInfoModel: Model<PoolInfo>,

        @InjectModel(SeoulPoolInfo.name)
        private readonly seoulPoolInfoModel: Model<SeoulPoolInfo>,

        @InjectModel(DailySwimSchedule.name)
        private readonly dailySwimScheduleModel: Model<DailySwimSchedule>,
    ) {}

    private delay(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    private generatePoolId(): string {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');

        const randomNumber = Math.floor(Math.random() * 0x10000);
        const hexPart = randomNumber.toString(16).padStart(4, '0');

        return `s${year}${month}${day}${hexPart}`;
    }

    async copySeoulPools() {
        this.logger.log('Starting copySeoulPools...');

        const poolDocs = await this.poolInfoModel.find().exec();
        this.logger.log(`Found ${poolDocs.length} docs in pool_info`);

        for (let doc of poolDocs) {
            const plainDoc = doc.toObject();

            if (plainDoc.address && plainDoc.address.includes('서울')) {
                delete plainDoc._id;

                await this.seoulPoolInfoModel.create(plainDoc);

                this.logger.log(`Inserted doc with pbid=${plainDoc.pbid} into seoul_pool_info`);
            }
        }

        this.logger.log('copySeoulPools completed.');
    }

    async refineSeoulPoolsInfo(): Promise<void> {
        this.logger.log('Starting refineSeoulPoolsInfo...');

        const seoulPoolDocs = await this.seoulPoolInfoModel.find().exec();

        for (const doc of seoulPoolDocs) {
            if (!doc.pbid) {
                this.logger.warn(`Skipping doc without pbid: ${JSON.stringify(doc)}`);
                continue;
            }

            const detailUrl = `${process.env.CRAWLING_TARGET_DETAIL_URL}?pbid=${doc.pbid}`;

            let removedHtml: string;
            try {
                removedHtml = await this.scraperService.fetchAndExtractText(detailUrl);
            } catch (err) {
                this.logger.error(`Failed to scrape detail URL=${detailUrl}`, err);
                continue;
            }

            let imgSrcUrls: string[];
            try {
                imgSrcUrls = await this.scraperService.fetchImageSrcInContainer(detailUrl);
            } catch (err) {
                this.logger.error(`Failed to fetch image src in container`, err);
                continue;
            }

            const prefixUrl = process.env.CRAWLING_TARGET_IMG_URL || '';
            const imgTexts: string[] = [];
            for (const src of imgSrcUrls) {
                try {
                    const fullImgUrl = prefixUrl + src;

                    const ocrResult = await this.ocrService.recognizeKoreanText(fullImgUrl);

                    imgTexts.push(ocrResult.data.text);
                    this.logger.debug(`OCR Texts for pbid=${doc.pbid}: ${ocrResult.data.text}`);
                } catch (err) {
                    this.logger.error(`Failed to OCR image: ${src}`, err);
                }
            }


            let refined: string;
            try {
                refined = await this.llmService.refineSwimInfo(removedHtml);
            } catch (err) {
                this.logger.error(`Failed to refine info for doc with pbid=${doc.pbid}`, err);
                continue;
            }

            this.logger.log(`Refined info for pbid=${doc.pbid} => ${refined}`);

            let schedules: any;
            try {
                const cleanRefined = refined
                    .trim()
                    .replace(/^```json\s*/i, '')
                    .replace(/\s*```$/, '');
                schedules = JSON.parse(cleanRefined);
            } catch (jsonError) {
                this.logger.error(`Failed to parse LLM JSON for pbid=${doc.pbid}`, jsonError);
                continue;
            }

            if (
                (Array.isArray(schedules) && schedules.length === 0) ||
                (typeof schedules === 'object' && Object.keys(schedules).length === 0)
            ) {
                this.logger.warn(`No data to insert (empty schedules) for pbid=${doc.pbid}`);
            } else {
                if (Array.isArray(schedules)) {
                    for (const schedule of schedules) {
                        await this.dailySwimScheduleModel.create({
                            ...schedule,
                            pool_code: doc.pool_code,
                            created_at: new Date(),
                        });
                    }
                    this.logger.log(`Inserted ${schedules.length} schedules for pbid=${doc.pbid}`);
                } else {
                    await this.dailySwimScheduleModel.create({
                        ...schedules,
                        pool_code: doc.pool_code,
                        created_at: new Date(),
                    });
                    this.logger.log(`Inserted 1 schedule object for pbid=${doc.pbid}`);
                }
            }

            await this.delay(2000);
        }

        this.logger.log('refineSeoulPoolsInfo completed.');
    }

    async getText() {
        const imgUrl = '';
        const text = await this.ocrService.recognizeKoreanText(imgUrl);
        this.logger.log( { text } );
    }
}
