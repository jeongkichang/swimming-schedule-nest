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
        return extractedText.trim();
    }

    async fetchImageSrcInContainer(url: string): Promise<string[]> {
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

        const srcList: string[] = [];
        $('.container img').each((_, elem) => {
            const src = $(elem).attr('src');
            if (src && src.includes('board')) {
                srcList.push(src.trim());
            }
        });

        return srcList;
    }

    private validateUrl(url: string): string {
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return `http://${url}`;
        }
        return url;
    }

    async fetchRawHtml(url: string): Promise<string> {
        const validUrl = this.validateUrl(url);
        let responseText = '';

        try {
            const response = await axios.get(validUrl);
            responseText = response.data;
        } catch (err) {
            this.logger.error(`Failed to fetch URL: ${validUrl}`, err);
            throw err;
        }

        // 불필요한 태그 제거 없이, 전체 HTML을 그대로 반환
        return responseText;
    }
}
