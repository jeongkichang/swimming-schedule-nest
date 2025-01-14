import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';

@Injectable()
export class ScraperService {
    private readonly logger = new Logger(ScraperService.name);

    async fetchAndExtractText(url: string): Promise<string> {
        const validUrl = this.validateUrl(url);
        let responseText = '';

        try {
            const response = await axios.get(validUrl);
            responseText = response.data;
        } catch (err) {
            this.logger.error(`Failed to fetch URL: ${validUrl}`, err);
            throw err;
        }

        const $ = cheerio.load(responseText);

        ['script', 'style', 'head', 'title'].forEach((selector) => {
            $(selector).remove();
        });

        const extractedText = $.text();
        console.log(extractedText.trim());
        return extractedText.trim();
    }

    private validateUrl(url: string): string {
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return `http://${url}`;
        }
        return url;
    }
}
