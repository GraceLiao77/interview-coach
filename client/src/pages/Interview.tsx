import { useEffect, useMemo, useState } from 'react'
import { get, post } from '../api/client'
import type { QuestionDto, QuestionTier, SessionDto } from '@shared/types'
import { QuestionCard } from './QuestionCard'
import './Interview.css'
import { useParams } from 'react-router-dom'
import { LiquidMetalButton } from '../components/ui/liquid-metal-button'
import { JobDescription } from './JobDescription'

const TIERS: Array<{ id: QuestionTier; label: string }> = [
  { id: 'warmup', label: 'Warmup' },
  { id: 'behavioral', label: 'Behavioral' },
  { id: 'technical', label: 'Technical' },
]

export function Interview() {
  const {sessionId } = useParams<{sessionId: string}>()
  const [questions, setQuestions] = useState<QuestionDto[]>([])
  const [activeTier, setActiveTier] = useState<QuestionTier>('warmup')
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

  // 每个 tab 上的数字。用 useMemo 是因为 questions 只在生成/加载时变,
  // 但每次输入答案都会让页面重渲染。
  const counts = useMemo(() => {
    const byTier = { warmup: 0, behavioral: 0, technical: 0 } as Record<QuestionTier, number>
    for (const q of questions) byTier[q.tier] += 1
    return byTier
  }, [questions])

  // 当前 tab 一道题都没有时,自动跳到第一个有题的分类,免得进来就看到空列表。
  // 依赖只写 questions:只在题目集合变化时纠正一次。
  useEffect(() => {
    if (questions.length === 0) return
    if (questions.some((q) => q.tier === activeTier)) return
    const firstWithQuestions = TIERS.find((t) => questions.some((q) => q.tier === t.id))
    if (firstWithQuestions) setActiveTier(firstWithQuestions.id)
  }, [questions])

  const visible = questions.filter((q) => q.tier === activeTier)

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

        {/* 右栏:按类别分 tab 的题目 */}
        <div className="questions">
          {questions.length === 0 ? (
            <p className="questions-empty">
              No questions yet — generate a set from the job description on the left.
            </p>
          ) : (
            <>
              <div className="tier-tabs" role="tablist" aria-label="Question tiers">
                {TIERS.map((tier) => (
                  <button
                    key={tier.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTier === tier.id}
                    className={`tier-tab${activeTier === tier.id ? ' is-active' : ''}`}
                    onClick={() => setActiveTier(tier.id)}
                  >
                    {tier.label}
                    <span className="tier-tab-count">({counts[tier.id]})</span>
                  </button>
                ))}
              </div>

              {visible.length === 0 ? (
                <p className="questions-empty">No {activeTier} questions in this set.</p>
              ) : (
                visible.map((q) => <QuestionCard key={q.id} question={q} />)
              )}
            </>
          )}
        </div>
      </div>
    </main>
  )
}
