import { Controller, Get } from '@nestjs/common';
import { WebService } from './web.service';

@Controller()
export class WebController {
    constructor(private readonly webService: WebService) {}

    @Get('available-swim')
    async getAvailableSwim() {
        return this.webService.getAvailableSwimSchedules();
    }
}
