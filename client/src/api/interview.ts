import { post } from "./client";
import type { SubmitAnswerResponse } from '@shared/types';

export async function submitAnswer(questionId: string, answer: string) {
    return post<SubmitAnswerResponse>(`/api/questions/${questionId}/answers`, {
        answer: answer
    })
}

/** 语音答题:走 multipart。post() 认得 FormData,会原样传、不序列化。 */
export async function submitAudioAnswer(questionId: string, blob: Blob) {
    const form = new FormData()
    // 字段名 'audio' 必须和后端 upload.single('audio') 一致;
    // 文件名写死 webm —— MVP 只支持 Chrome。
    form.append('audio', blob, 'answer.webm')

    return post<SubmitAnswerResponse>(`/api/questions/${questionId}/answers/audio`, form)
}
