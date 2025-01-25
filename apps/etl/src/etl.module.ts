import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from '@libs/db';
import { LlmModule } from '@libs/llm';
import { ScraperModule } from '@libs/scraper';
import { EtlService } from './etl.service';
import { OcrModule } from "@libs/ocr";

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),
        DbModule,
        LlmModule,
        ScraperModule,
        OcrModule,
    ],
    providers: [EtlService],
})
export class EtlModule {}
