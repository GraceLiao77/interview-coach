import { post } from "./client";
import type { SubmitAnswerResponse } from '@shared/types';
export async function submitAnswer(questionId: string, answer: string) {
    return post<SubmitAnswerResponse>(`/api/questions/${questionId}/answers`, {
        answer: answer
    })
}