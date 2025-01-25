import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PoolInfo, PoolInfoSchema } from './schemas/pool-info.schema';
import {DailySwimSchedule, DailySwimScheduleSchema} from "@libs/db/schemas/daily-swim-schedule.schema";
import {SeoulPoolInfo, SeoulPoolInfoSchema} from "@libs/db/schemas/seoul-pool-info.schema";
import {SwimmingPool, SwimmingPoolSchema} from "@libs/db/schemas/swimming-pool.schema";

@Module({
    imports: [
        MongooseModule.forFeature([
            {
                name: SwimmingPool.name,
                schema: SwimmingPoolSchema,
                collection: 'swimming_pool'
            },
            {
                name: PoolInfo.name,
                schema: PoolInfoSchema,
                collection: 'pool_info'
            },
            {
                name: SeoulPoolInfo.name,
                schema: SeoulPoolInfoSchema,
                collection: 'seoul_pool_info'
            },
            {
                name: DailySwimSchedule.name,
                schema: DailySwimScheduleSchema,
                collection: 'daily_swim_schedule'
            },
        ]),
    ],
    exports: [
        MongooseModule,
    ],
})
export class DbModule {}