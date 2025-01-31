import { Module } from '@nestjs/common';
import { MapService } from './map.service';
import { ConfigModule } from "@nestjs/config";

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),
    ],
    providers: [MapService],
    exports: [MapService],
})
export class MapModule {}
