import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DbService } from '@app/db';
// import { SomeCommonUtil } from '@app/common'; // 공통 유틸 예시

@Injectable()
export class EtlService {
    private readonly logger = new Logger(EtlService.name);

    constructor(private readonly dbService: DbService) {}

    @Cron(CronExpression.EVERY_5_MINUTES)
    async handleCron() {
        this.logger.log('ETL Job Started');

        // const rows = await this.dbService.getDataFromMongo();
        //
        // for (const row of rows) {
        //     const html = await SomeCommonUtil.getHtml(row.url);
        //     const cleanText = SomeCommonUtil.stripHtmlTags(html);
        //     const extracted = await SomeCommonUtil.callGeminiLLM(cleanText);
        //     // extracted → JSON 형태라고 가정
        //     await this.dbService.insertDataToMongo(extracted);
        // }

        this.logger.log('ETL Job Finished');
    }
}
