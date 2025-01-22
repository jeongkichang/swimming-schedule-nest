import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DbService } from '@libs/db';
import { Collection } from 'mongodb';
import {LlmService} from "@libs/llm";
import {ScraperService} from "@libs/scraper";
import {OcrService} from "@libs/ocr";

@Injectable()
export class EtlService {
    private readonly logger = new Logger(EtlService.name);

    constructor(
        private readonly dbService: DbService,
        private readonly llmService: LlmService,
        private readonly scraperService: ScraperService,
        private readonly ocrService: OcrService,
    ) {}

    // @Cron(CronExpression.EVERY_10_SECONDS)
    async handleCronJob() {
        this.logger.log('Running ETL Cron Job...');

        const db = this.dbService.getDatabase();
        const collection: Collection = db.collection('swimming_pool');
        const dailySwimScheduleColl: Collection = db.collection('daily_swim_schedule');

        const results = await collection.find({}).toArray();
        for (const result of results) {
            const url = result.url;
            const removedHtml = await this.scraperService.fetchAndExtractText(url);
            const refined = await this.llmService.refineSwimInfo(removedHtml);
            this.logger.debug(`Refined Info: ${refined}`);

            let schedules = refined
                .trim()
                .replace(/^```json\s*/i, '')
                .replace(/\s*```$/, '');

            try {
                schedules = JSON.parse(schedules);
            } catch (parseError) {
                this.logger.error(`Failed to parse LLM response: ${parseError}`);
                continue;
            }

            if (Array.isArray(schedules)) {
                for (const schedule of schedules) {
                    await dailySwimScheduleColl.insertOne({
                        ...schedule,
                        pool_code: result.code,
                        createdAt: new Date(),
                    });
                }
                this.logger.log(`Inserted ${schedules.length} schedules for URL: ${url}`);
            } else {
                this.logger.warn(`LLM response is not an array: ${refined}`);
            }
        }

        this.logger.log('ETL Cron Job completed.');
    }

    async crawlPoolData() {
        this.logger.log('Starting pool data crawling...');

        const db = this.dbService.getDatabase();
        const poolCollection = db.collection('pool_info');

        const allResults = [];

        let pageIndex = 1;
        let hasMoreData = true;

        while (hasMoreData) {
            const data = await this.scraperService.fetchPoolInfo(pageIndex);

            const extracted = data.map((item) => {
                return {
                    title: item.title,
                    address: item.address,
                    pbid: item.pbid,
                };
            });

            allResults.push(...extracted);

            for (const item of extracted) {
                const uniqueId = this.generatePoolId();
                await poolCollection.insertOne({
                    poolId: uniqueId,
                    title: item.title,
                    address: item.address,
                    pbid: item.pbid,
                    createdAt: new Date(),
                });
            }

            if (data.length === 0) {
                this.logger.log('No more data found. Stopping.');
                hasMoreData = false;
            } else {
                pageIndex++;
            }
            if (pageIndex > 94) {
                this.logger.warn('Reached page limit. Stopping...');
                hasMoreData = false;
            }

            await this.delay(2000);
        }

        this.logger.log('Completed pool data crawling.');
    }

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

        const db = this.dbService.getDatabase();
        const poolCollection: Collection = db.collection('pool_info');
        const seoulCollection: Collection = db.collection('seoul_pool_info');

        const poolDocs = await poolCollection.find({}).toArray();
        this.logger.log(`Found ${poolDocs.length} docs in pool_info`);

        for (const doc of poolDocs) {
            if (doc.address && doc.address.includes('서울')) {
                delete doc._id;

                await seoulCollection.insertOne(doc);
                this.logger.log(`Inserted doc with pbid=${doc.pbid} into seoul_pool_info`);
            }
        }

        this.logger.log('copySeoulPools completed.');
    }

    async refineSeoulPoolsInfo(): Promise<void> {
        this.logger.log('Starting refineSeoulPoolsInfo...');

        const db = this.dbService.getDatabase();
        const seoulCollection: Collection = db.collection('seoul_pool_info');
        const dailySwimScheduleColl: Collection = db.collection('daily_swim_schedule');

        const seoulDocs = await seoulCollection.find({}).toArray();
        this.logger.log(`Found ${seoulDocs.length} docs in seoul_pool_info`);

        for (const doc of seoulDocs) {
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
                        await dailySwimScheduleColl.insertOne({
                            ...schedule,
                            pool_code: doc.poolId,
                            createdAt: new Date(),
                        });
                    }
                    this.logger.log(`Inserted ${schedules.length} schedules for pbid=${doc.pbid}`);
                } else {
                    await dailySwimScheduleColl.insertOne({
                        ...schedules,
                        pool_code: doc.poolId,
                        createdAt: new Date(),
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
