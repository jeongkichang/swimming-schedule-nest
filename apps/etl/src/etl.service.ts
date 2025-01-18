import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DbService } from '@libs/db';
import { Collection } from 'mongodb';
import {LlmService} from "@libs/llm";
import {ScraperService} from "@libs/scraper";

@Injectable()
export class EtlService {
    private readonly logger = new Logger(EtlService.name);

    constructor(
        private readonly dbService: DbService,
        private readonly llmService: LlmService,
        private readonly scraperService: ScraperService,
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
}
