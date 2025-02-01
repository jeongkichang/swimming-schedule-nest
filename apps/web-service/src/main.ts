import { NestFactory } from '@nestjs/core';
import { WebModule } from './web.module';

async function bootstrap() {
    const app = await NestFactory.create(WebModule);
    app.enableCors({
        origin: '*', // or ['http://localhost:3001'] 등
    });
    await app.listen(3000);
}
bootstrap();
