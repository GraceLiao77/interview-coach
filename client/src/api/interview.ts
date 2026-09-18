import { post } from "./client";
import type { SubmitAnswerResponse, TranscribeResponse } from '@shared/types';

export async function submitAnswer(questionId: string, answer: string) {
    return post<SubmitAnswerResponse>(`/api/questions/${questionId}/answers`, {
        answer: answer
    })
}

/**
 * 只转写,不评分。文字回填进 textarea 后由用户确认,再走 submitAnswer 评分。
 * post() 认得 FormData,会原样传、不做 JSON.stringify。
 */
export async function transcribeAudio(questionId: string, blob: Blob) {
    const form = new FormData()
    // 字段名 'audio' 必须和后端 upload.single('audio') 一致;
    // 文件名写死 webm —— MVP 只支持 Chrome。
    form.append('audio', blob, 'answer.webm')

    return post<TranscribeResponse>(`/api/questions/${questionId}/transcribe`, form)
}
