import { toFile } from 'groq-sdk';
import { groq } from '../lib/groq'
import { env } from '../env'
import { logger } from '../utils/logger'

const MOCK_TRANSCRIPT = 'Last week I fixed a bug in production. It was very hard but I solve it.'

export async function transcribe(buffer: Buffer): Promise<string> {
    if (env.mockTranscription) return MOCK_TRANSCRIPT

    const transcription = await groq.audio.transcriptions.create({
        // 文件名的扩展名决定 Whisper 用哪个解码器 —— MVP 只支持 Chrome,固定 webm
        file: await toFile(buffer, 'answer.webm', { type: 'audio/webm' }),
        model: 'whisper-large-v3-turbo',
        language: 'en',
    });

    const text = transcription.text.trim()
    logger.info('Groq transcript', { bytes: buffer.length, chars: text.length, text })
    return text
}
