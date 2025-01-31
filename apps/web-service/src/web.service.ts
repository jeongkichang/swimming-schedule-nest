import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from "@nestjs/mongoose";
import { DailySwimSchedule } from "@libs/db/schemas/daily-swim-schedule.schema";
import { Model } from "mongoose";

@Injectable()
export class WebService {
    private readonly logger = new Logger(WebService.name);

    constructor(
        @InjectModel(DailySwimSchedule.name)
        private readonly dailySwimScheduleModel: Model<DailySwimSchedule>,
    ) {}

    async getAvailableSwimSchedules(): Promise<any[]> {
        const now = new Date();
        const dayStringList = ['일', '월', '화', '수', '목', '금', '토'];
        const currentDayKorean = dayStringList[now.getDay()];
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        let results = await this.dailySwimScheduleModel.aggregate([
            {
                $match: { day: currentDayKorean }
            },
            {
                $lookup: {
                    from: 'seoul_pool_info',
                    localField: 'pool_code',
                    foreignField: 'pool_code',
                    as: 'poolInfo'
                }
            },
            {
                $unwind: {
                    path: '$poolInfo',
                    preserveNullAndEmptyArrays: true
                }
            },
        ]);

        results = results.filter((doc: any) => {
            if (!doc.time_range) return false;
            const [startStr] = doc.time_range.split('-').map((t: string) => t.trim());
            const [startHour, startMin] = startStr.split(':').map(Number);

            const nowInMinutes = currentHour * 60 + currentMinute;
            const startInMinutes = startHour * 60 + startMin;

            return nowInMinutes <= startInMinutes;
        });

        const output = results.map((doc: any) => ({
            day: doc.day,
            time_range: doc.time_range,
            adult_fee: doc.adult_fee,
            teen_fee: doc.teen_fee,
            child_fee: doc.child_fee,
            pool_code: doc.pool_code,
            title: doc.poolInfo?.title,
            address: doc.poolInfo?.address,
        }));

        this.logger.log(`Found ${output.length} schedules for ${currentDayKorean} after ${currentHour}:${currentMinute}`);
        return output;
    }
}
