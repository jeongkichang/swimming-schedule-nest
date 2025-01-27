import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DailySwimSchedule, DailySwimScheduleSchema } from "@libs/db/schemas/daily-swim-schedule.schema";
import { SeoulPoolInfo, SeoulPoolInfoSchema } from "@libs/db/schemas/seoul-pool-info.schema";
import { ConfigModule, ConfigService } from "@nestjs/config";

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),
        MongooseModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                uri: configService.get<string>('MONGO_URI') || 'mongodb://localhost:27017/dbname',
            }),
            inject: [ConfigService],
        }),
        MongooseModule.forFeature([
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