import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from '@libs/db';
import { WebController } from './web.controller';
import {WebService} from "./web.service";

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),
        DbModule,
    ],
    controllers: [WebController],
    providers: [WebService],
})
export class WebModule {}
