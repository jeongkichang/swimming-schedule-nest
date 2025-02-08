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

    /**
     * @param rawText - 여러 줄로 된 원본 텍스트
     */
    async insertSeoulPoolInfoFromText(rawText: string): Promise<void> {
        this.logger.log('Start: insertSeoulPoolInfoFromText');

        // 줄 단위로 분리
        const lines = rawText.split('\n').map(line => line.trim()).filter(line => line !== '');

        let successCount = 0;
        let failureCount = 0;

        for (const line of lines) {
            try {
                const [title, address, availableDailySwimming] = line
                    .split(',')
                    .map(item => item.trim());

                // pool_code 자동 생성
                const newPoolCode = this.generatePoolId();

                await this.seoulPoolInfoModel.create({
                    pool_code: newPoolCode,
                    title,
                    address,
                    available_daily_swimming: availableDailySwimming,
                    created_at: new Date(),
                });

                this.logger.debug(`Inserted: ${title} / ${address} / ADS=${availableDailySwimming} / pool_code=${newPoolCode}`);
                successCount++;
            } catch (error) {
                this.logger.error(`Failed to insert line: ${line}`, error);
                failureCount++;
            }
        }

        this.logger.log(`Done: insertSeoulPoolInfoFromText - successCount=${successCount}, failureCount=${failureCount}`);
    }
}
