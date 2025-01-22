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

    async fetchPoolInfo(pageIndex: number = 1, searchInfo: string = ''): Promise<{
        title: string,
        address: string,
        pbid: string,
    }[]> {
        const url = process.env.CRAWLING_TARGET_URL;
        if (!url) {
            throw new Error('CRAWLING_TARGET_URL is not defined in the environment variables.');
        }

        const formData = new URLSearchParams();
        formData.append('searchInfo', searchInfo);
        formData.append('pageIndex', pageIndex.toString());

        try {
            const response = await axios.post(url, formData.toString(), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });

            this.logger.log(`Fetched data for pageIndex=${pageIndex}, count=${response.data.data?.length ?? 0}`);
            return response.data.data;
        } catch (error) {
            this.logger.error(`Error fetching pool info for pageIndex=${pageIndex}`, error);
            throw error;
        }
    }

}
