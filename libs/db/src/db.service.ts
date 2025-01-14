import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { MongoClient, Db } from 'mongodb';

@Injectable()
export class DbService implements OnModuleInit, OnModuleDestroy {
    private client: MongoClient;
    private db: Db;

    constructor() {
        const uri = process.env.MONGO_URI;
        if (!uri) {
            throw new Error('MONGO_URI is not defined in the environment variables');
        }
        this.client = new MongoClient(uri);
    }

    async onModuleInit() {
        await this.client.connect();
        this.db = this.client.db(process.env.MONGO_DB_NAME);
        // console.log('Connected to MongoDB');
    }

    async onModuleDestroy() {
        await this.client.close();
        // console.log('Disconnected from MongoDB');
    }

    getDatabase(): Db {
        if (!this.db) {
            throw new Error('Database connection is not established yet.');
        }
        return this.db;
    }
}
