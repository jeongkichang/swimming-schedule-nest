import { Controller, Get, Param } from '@nestjs/common';
import { DbService } from '@app/db';

@Controller()
export class WebController {
    constructor(private readonly dbService: DbService) {}

    @Get('item/:id')
    async getItem(@Param('id') id: string) {
        const data = await this.dbService.findOneById(id);
        return data;
    }
}
