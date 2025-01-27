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

    async fetchAndExtractOriginUpdateAtText(url: string): Promise<string> {
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

        const pageText = $('body').text();

        const match = pageText.match(/업데이트 : \s*(.+)/);

        if (match && match[1]) {
            const line = match[1].split('\n')[0].trim();
            return line;
        }

        return '';
    }
}
