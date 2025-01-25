import { NestFactory } from '@nestjs/core';
import { EtlModule } from './etl.module';
import {EtlService} from "./etl.service";

async function bootstrap() {
    const app = await NestFactory.create(EtlModule);
    await app.init();
}
bootstrap();
