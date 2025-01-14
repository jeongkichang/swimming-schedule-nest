import { Controller, Get } from '@nestjs/common';
import { DbService } from '@libs/db';
import { Collection } from 'mongodb';

@Controller()
export class WebController {
    constructor(private readonly dbService: DbService) {}

    @Get()
    async getData() {
        const db = this.dbService.getDatabase();
        const collection: Collection = db.collection('swimming_pool');

        const data = await collection.find().toArray();
        return { data };
    }
}
