import { Injectable, Logger } from '@nestjs/common';
import { createWorker } from 'tesseract.js';

@Injectable()
export class OcrService {
    private readonly logger = new Logger(OcrService.name);

    async recognizeKoreanText(imagePathOrUrl: string): Promise<void> {
        (async () => {
            const worker = await createWorker('kor', 1, {
                logger: (m) => console.log(m),
            });
            const ret = await worker.recognize(imagePathOrUrl);
            console.log(ret.data.text);
            await worker.terminate();
        })();
    }
}
