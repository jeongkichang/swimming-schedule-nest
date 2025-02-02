import { NestFactory } from '@nestjs/core';
import { EtlModule } from './etl.module';

async function bootstrap() {
    const app = await NestFactory.create(EtlModule);
    await app.init();
}
bootstrap();
