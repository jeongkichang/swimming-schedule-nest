import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from "@libs/llm";
import { ScraperService } from "@libs/scraper";
import { OcrService } from "@libs/ocr";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { DailySwimSchedule } from "@libs/db/schemas/daily-swim-schedule.schema";
import { SeoulPoolInfo } from "@libs/db/schemas/seoul-pool-info.schema";

@Injectable()
export class EtlService {
    private readonly logger = new Logger(EtlService.name);

    constructor(
        private readonly llmService: LlmService,
        private readonly scraperService: ScraperService,
        private readonly ocrService: OcrService,

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

            const combinedImgText = imgTexts.join('\n');

            let refined: string;
            try {
                refined = await this.llmService.refineSwimInfo(removedHtml, combinedImgText);
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

    async updateAddressToBeFullName() {
        const seoulPoolDocs = await this.seoulPoolInfoModel.find().exec();

        let updatedCount = 0;

        for (const doc of seoulPoolDocs) {
            if (!doc.address) {
                continue;
            }

            // (1) 기존 address에 "서울"이 있는지 확인
            //     정규식 /서울/g -> 모든 "서울" 단어를 "서울특별시"로 바꿈
            const newAddress = doc.address.replace(/서울/g, '서울특별시');

            if (newAddress !== doc.address) {
                // (2) 실제로 변경사항이 있다면 저장
                doc.address = newAddress;
                await doc.save();
                updatedCount++;
                this.logger.log(`Updated address for pool_code=${doc.pool_code} to ${doc.address}`);
            }
        }

        this.logger.log('All docs updated successfully.');
    }
}
