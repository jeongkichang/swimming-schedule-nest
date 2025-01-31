import { Injectable, Logger } from '@nestjs/common';
import axios from "axios";

@Injectable()
export class MapService {
    private readonly logger = new Logger(MapService.name);

    async getLatLngWithNaver(address: string): Promise<{ lat: number; lng: number }> {
        const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
        const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;
        if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
            throw new Error('Naver Map credentials are not set.');
        }

        const url = 'https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode';

        const response = await axios.get(url, {
            params: { query: address },
            headers: {
                'X-NCP-APIGW-API-KEY-ID': NAVER_CLIENT_ID,
                'X-NCP-APIGW-API-KEY': NAVER_CLIENT_SECRET,
            },
        });

        const addresses = response.data.addresses;
        if (!addresses || addresses.length === 0) {
            throw new Error(`No result for address: ${address}`);
        }

        const { x, y } = addresses[0];
        return { lng: parseFloat(x), lat: parseFloat(y) };
    }
}
