import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class LlmService {
    private readonly logger = new Logger(LlmService.name);
    private genAI: GoogleGenerativeAI;
    private model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>;

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is not set in environment variables');
        }

        this.genAI = new GoogleGenerativeAI(apiKey);

        this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    }

    async refineSwimInfo(removedHtml: string): Promise<string> {
        const prompt = `
    <content></content> 내용을 참고해서 자유 수영에 대한 정보를 정리해줘.
    1회 이용에 대한 정보만 정리해줘.
    보통, 1회 이용료는 20,000원이 넘지 않아. 그것들은 제외해줘.
    같은 시간대에 요금이 상이하면, 상이한대로 시간과 함께 구별해서 모두 표기해줘.
    아래와 같이 json 형식 문자열로 만들어줘.
    자유 수영에 대한 정보 이외에 추가적인 설명은 하지 않아도 돼.

    <example>
    [
        {
            "day": "화",
            "time_range": "08:00-08:50",
            "adult_fee": 9000,
            "teen_fee": 5000
        },
        // ...
    ]
    </example>

    <content>
    ${removedHtml}
    </content>
    `;

        try {
            const result = await this.model.generateContent(prompt);

            return result?.response?.text
                ? result.response.text()
                : 'No response text.';

        } catch (err) {
            this.logger.error('Gemini LLM request failed:', err);
            throw err;
        }
    }
}
