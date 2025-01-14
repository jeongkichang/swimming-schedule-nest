import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DbService } from '@libs/db';
import { Collection } from 'mongodb';

@Injectable()
export class EtlService {
    private readonly logger = new Logger(EtlService.name);

    constructor(private readonly dbService: DbService) {}

    @Cron(CronExpression.EVERY_5_SECONDS)
    async handleCronJob() {
        this.logger.log('Running ETL Cron Job...');

        const db = this.dbService.getDatabase();
        const collection: Collection = db.collection('swimming_pool');

        const result = await collection.find({}).toArray();
        this.logger.log(`Found ${result.length} transaction(s).`);

        console.log(result);

        this.logger.log('ETL Cron Job completed.');
    }
}
