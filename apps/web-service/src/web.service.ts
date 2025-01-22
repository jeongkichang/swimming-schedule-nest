import { Injectable, Logger } from '@nestjs/common';
import { DbService } from '@libs/db';
import { Collection } from 'mongodb';

@Injectable()
export class WebService {
    private readonly logger = new Logger(WebService.name);

    constructor(private readonly dbService: DbService) {}

    async getAvailableSwimSchedules(): Promise<any[]> {
        const now = new Date();
        const dayStringList = ['일', '월', '화', '수', '목', '금', '토'];
        const currentDayKorean = dayStringList[now.getDay()];
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        const db = this.dbService.getDatabase();
        const scheduleCollection: Collection = db.collection('daily_swim_schedule');

        const schedules = await scheduleCollection.find({ day: currentDayKorean }).toArray();

        const filtered = schedules.filter((schedule) => {
            const timeRange = schedule.time_range as string;
            const [startStr, endStr] = timeRange.split('-').map((t) => t.trim());

            const [startHour, startMin] = startStr.split(':').map(Number);

            const nowInMinutes = currentHour * 60 + currentMinute;
            const startInMinutes = startHour * 60 + startMin;

            return nowInMinutes <= startInMinutes;
        });

        this.logger.log(`Found ${filtered.length} schedules for day=${currentDayKorean} after ${currentHour}:${currentMinute}`);
        return filtered;
    }
}
