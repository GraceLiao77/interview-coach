import { useEffect, useState } from 'react'
import { get, post } from '../api/client'
import type { QuestionDto, SessionDto } from '@shared/types'
import { QuestionCard } from './QuestionCard'
import './Interview.css'
import { useParams } from 'react-router-dom'
import { LiquidMetalButton } from '../components/ui/liquid-metal-button'
import { JobDescription } from './JobDescription'

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

      <div className="interview-body">
        {/* 左栏:JD + 正下方等宽的生成按钮 */}
        <aside className="jd-panel">
          {sessionData?.jobDescription ? (
            <>
              <h2 className="jd-title">Job description</h2>
              <JobDescription text={sessionData.jobDescription} />
            </>
          ) : (
            <p className="jd-empty">No job description on this session.</p>
          )}

          <LiquidMetalButton disabled={genLoading.loading} onClick={handleGenerate}>
            {genLoading.text}
          </LiquidMetalButton>
        </aside>

        {/* 右栏:生成出来的题目 */}
        <div className="questions">
          {questions.length === 0 ? (
            <p className="questions-empty">
              No questions yet — generate a set from the job description on the left.
            </p>
          ) : (
            questions.map((q) => <QuestionCard key={q.id} question={q} />)
          )}
        </div>
      </div>
    </main>
  )
}
