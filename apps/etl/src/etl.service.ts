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

    @Cron(CronExpression.EVERY_5_SECONDS)
    async handleCronJob() {
        this.logger.log('Running ETL Cron Job...');

        const db = this.dbService.getDatabase();
        const collection: Collection = db.collection('swimming_pool');

        const results = await collection.find({}).toArray();
        for (const result of results) {
            const url = result.url;
            const removedHtml = await this.scraperService.fetchAndExtractText(url);
            const refined = await this.llmService.refineSwimInfo(removedHtml);
            this.logger.debug(`Refined Info: ${refined}`);
        }

        this.logger.log('ETL Cron Job completed.');
    }
}
