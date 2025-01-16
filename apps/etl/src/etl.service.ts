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
}
