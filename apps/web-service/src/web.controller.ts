import {Body, Controller, Get, Post} from '@nestjs/common';
import { WebService } from './web.service';

@Controller()
export class WebController {
    constructor(private readonly webService: WebService) {}

    @Get('available-swim')
    async getAvailableSwim() {
        return this.webService.getAvailableSwimSchedules();
    }

    @Post('available-swim-near')
    async getAvailableSwimNear(@Body() body: { lat: number; lng: number }) {
        const { lat, lng } = body;
        return this.webService.getAvailableSwimSchedulesNear(lat, lng);
    }
}
