import { NestFactory } from '@nestjs/core';
import { EtlModule } from './etl.module';
import { EtlService } from "./etl.service";

async function bootstrap() {
    const app = await NestFactory.create(EtlModule);
    await app.init();

    const etlService = app.get(EtlService);
    await etlService.updateAvailableDailySwimming();
    await etlService.deleteDailySwimScheduleByPoolCodes();
    await etlService.updateAvailableHtmlCrawling();
}
bootstrap();
