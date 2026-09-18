import { useEffect, useState } from 'react'
import { get, post } from '../api/client'
import type { QuestionDto, SessionDto } from '@shared/types'
import { QuestionCard } from './QuestionCard'
import './Interview.css'
import { useParams } from 'react-router-dom'

export function Interview() {
  const {sessionId } = useParams<{sessionId: string}>()
  const [questions, setQuestions] = useState<QuestionDto[]>([])
  const [sessionData, setSessionData] = useState<SessionDto>()
  const [genLoading, setGenLoading] = useState<{
    loading: boolean,
    text: string // 'Generate Questions', Generating…
  }>({
    loading: false,
    text: 'Generate Questions'
  })
  // 进页面就把 session 读出来(纯读,不花钱)。JD 是用户建 session 时手输的,
  // 之前只在 handleGenerate 里 setSessionData,所以看起来像"生成出来的"。
  useEffect(() => {
    if (!sessionId) return
    get<SessionDto>(`/api/sessions/${sessionId}`)
      .then((res) => {
        setSessionData(res)
        setQuestions(res.questions)
      })
      .catch((err) => console.log(err))
  }, [sessionId])

  const handleGenerate = () => {
    setGenLoading({
      loading: true,
      text: 'Generating…'
    })
    post<SessionDto>(`/api/sessions/${sessionId}/generate-questions`).then(
      (res) => {
        console.log(res, 'res===')
        setQuestions(res.questions)
        setSessionData(res)
      }).catch((err) => {
        console.log(err)
      }).finally(() => {
        setGenLoading({
          loading: false,
          text: 'Generate Questions'
        })
      })
  }

  return (
    <main className="interview">
      <header className="interview-header">
        <a className="back-link" href="/">← Back</a>
        <h1>Mock Interview</h1>
      </header>

     {sessionData?.jobDescription && <p className="jd">{sessionData.jobDescription}</p>}

      <button className="primary-btn btn-ai" disabled={genLoading.loading} onClick={handleGenerate}>{genLoading.text}</button>

      <div className="questions">
        {questions.map((q) => <QuestionCard key={q.id} question={q} />)}
          
      </div>
    </main>
  )
}
