import { Injectable } from '@nestjs/common';
import { DbService } from './db.service';
import { Collection } from 'mongodb';

@Injectable()
export class CollectionFactory {
    constructor(private readonly dbService: DbService) {}

    getCollection<T extends Document>(name: string): Collection<T> {
        const db = this.dbService.getDatabase();
        return db.collection<T>(name);
    }
}
