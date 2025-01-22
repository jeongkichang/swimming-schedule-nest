import { Injectable, Logger } from '@nestjs/common';
import { createWorker } from 'tesseract.js';

@Injectable()
export class OcrService {
    private readonly logger = new Logger(OcrService.name);

    async recognizeKoreanText(imagePathOrUrl: string): Promise<Tesseract.RecognizeResult> {
        const worker = await createWorker('kor', 1, {
            logger: (m) => console.log(m),
        });
        const ret = await worker.recognize(imagePathOrUrl);
        this.logger.debug(`OCR result for ${imagePathOrUrl}: ${ret}`);
        await worker.terminate();

        return ret;
    }
}
