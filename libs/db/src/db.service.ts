import { Injectable } from '@nestjs/common';

@Injectable()
export class DbService {
    async getDataFromMongo() {
        // Mongo DB 조회 로직
    }

    async insertDataToMongo(data: any) {
        // Mongo DB insert 로직
    }

    async findOneById(id: string) {
        // Mongo DB에서 특정 id 조회 로직
    }
}
