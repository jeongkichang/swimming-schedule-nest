import axios from 'axios';

export class SomeCommonUtil {
    static async getHtml(url: string): Promise<string> {
        const response = await axios.get(url);
        return response.data;
    }

    static stripHtmlTags(html: string): string {
        return html.replace(/<[^>]*>/g, '');
    }

    static async callGeminiLLM(content: string): Promise<any> {
        // Gemini LLM API 호출 예시
        // API 호출 후 결과를 JSON으로 파싱하는 형태
        return { parsed: 'parsed data from LLM' };
    }
}
