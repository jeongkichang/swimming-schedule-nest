import { NestFactory } from '@nestjs/core';
import { EtlModule } from './etl.module';
import { EtlService } from "./etl.service";

async function bootstrap() {
    const app = await NestFactory.create(EtlModule);
    await app.init();

    const rawText = ``;

    const etlService = app.get(EtlService);
    await etlService.insertSeoulPoolInfoFromText(rawText);
    await app.close();

}
bootstrap();
