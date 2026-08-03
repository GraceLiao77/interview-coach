import { useEffect, useState } from 'react'
import { post } from '../api/client'
import type { QuestionDto, SessionDto } from '@shared/types'
import { QuestionCard } from './QuestionCard'
import './Interview.css'
import { useParams } from 'react-router-dom'

/**
 * 纯展示骨架 (markup + className only) —— 逻辑全部交给你。
 * 里面是静态示例内容,方便你先看到样式。你要做的:
 *   1. 加 state / props / API 调用(generateQuestions, submitAnswer)
 *   2. 把静态文字换成真实数据
 *   3. 接上事件(onClick / onChange)
 * 每处 `👉 你在这接逻辑` 就是要动手的地方。
 * 建议:把 <section className="q-card"> 抽成 <QuestionCard>,把 .score-card 抽成 <ScoreCard>。
 */
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
  useEffect(() => {
    
  }, [])

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
        {/* 👉 你在这接逻辑:换成 <Link to="/">← Back</Link> */}
        <a className="back-link" href="/">← Back</a>
        <h1>Mock Interview</h1>
      </header>

     {sessionData?.jobDescription && <p className="jd">{sessionData.jobDescription}</p>}

      <button className="primary-btn" disabled={genLoading.loading} onClick={handleGenerate}>{genLoading.text}</button>

      {/* 👉 你在这接逻辑:{error && <p className="error">{error}</p>} */}

      <div className="questions">
        {questions.map((q) => <QuestionCard key={q.id} question={q} />)}


          
      </div>
    </main>
  )
}
