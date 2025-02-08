import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from "@libs/llm";
import { ScraperService } from "@libs/scraper";
import { OcrService } from "@libs/ocr";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { DailySwimSchedule } from "@libs/db/schemas/daily-swim-schedule.schema";
import { SeoulPoolInfo } from "@libs/db/schemas/seoul-pool-info.schema";

@Injectable()
export class EtlService {
    private readonly logger = new Logger(EtlService.name);

    constructor(
        private readonly llmService: LlmService,
        private readonly scraperService: ScraperService,
        private readonly ocrService: OcrService,

        @InjectModel(SeoulPoolInfo.name)
        private readonly seoulPoolInfoModel: Model<SeoulPoolInfo>,

        @InjectModel(DailySwimSchedule.name)
        private readonly dailySwimScheduleModel: Model<DailySwimSchedule>,
    ) {}

    private delay(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    private generatePoolId(): string {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');

        const randomNumber = Math.floor(Math.random() * 0x10000);
        const hexPart = randomNumber.toString(16).padStart(4, '0');

        return `s${year}${month}${day}${hexPart}`;
    }
}
