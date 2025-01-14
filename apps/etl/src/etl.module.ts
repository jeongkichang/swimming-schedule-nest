import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DbModule } from '@libs/db';
import { EtlService } from './etl.service';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),
        DbModule,
        ScheduleModule.forRoot(),
    ],
    providers: [EtlService],
})
export class EtlModule {}
