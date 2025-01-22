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
    자유 수영은 일일 수영이라고 표현되기도 하는 부분을 참고해.
    1회 이용에 대한 정보만 정리해줘.
    보통, 1회 이용료는 20,000원이 넘지 않아. 그것들은 제외해줘.
    같은 시간대에 요금이 상이하면, 상이한대로 시간과 함께 구별해서 모두 표기해줘.
    아래와 같이 json 형식 문자열로 만들어줘.
    자유 수영에 대한 정보 이외에 추가적인 설명은 하지 않아도 돼.
    영업 종료를 했다거나 서비스 운영을 하지 않는다는 문구가 있다면, 해당 수영장 자유 수영 정보는 추출하지 않아도 돼.
    시간, 날짜, 요금은 꼭 포함되어야 해. day, time_range, fee에 대한 정보 중 하나라도 null로 판단되면, 그냥 json 빈 객체로 대답해줘.
    만약에 자유 수영, 일일 수영에 대한 정보를 찾을 수 없을 것 같다면, json 빈 객체로 대답해줘.

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

        const maxAttempts = 3;
        let attempt = 0;

        while (attempt < maxAttempts) {
            attempt++;
            try {
                const result = await this.model.generateContent(prompt);

                if (result?.response?.text) {
                    return result.response.text();
                } else {
                    this.logger.warn('No response text in LLM result');
                    return 'No response text.';
                }
            } catch (err) {
                this.logger.error(`Gemini LLM request failed (attempt=${attempt}):`, err);

                const errorMessage = String(err);
                if (
                    attempt < maxAttempts &&
                    (errorMessage.includes('Too Many Requests') ||
                        errorMessage.includes('429') ||
                        errorMessage.includes('too many requests'))
                ) {
                    const delayMs = 2000;
                    this.logger.warn(`Retrying LLM request in ${delayMs} ms...`);
                    await this.delay(delayMs);
                } else {
                    throw err;
                }
            }
        }

        throw new Error('Gemini LLM request failed after retries.');
    }

    private delay(ms: number) {
        return new Promise<void>((resolve) => setTimeout(resolve, ms));
    }
}
