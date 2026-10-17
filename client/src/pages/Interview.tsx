import { useCallback, useEffect, useMemo, useState } from 'react'
import { get, post } from '../api/client'
import type { QuestionDetailDto, QuestionTier, SessionDetailDto } from '@shared/types'
import { QuestionCard } from './QuestionCard'
import './Interview.css'
import { useParams } from 'react-router-dom'
import { LiquidMetalButton } from '../components/ui/liquid-metal-button'
import { Breadcrumb } from '../components/ui/breadcrumb'
import { Home, MessagesSquare } from 'lucide-react'
import { JobDescription } from './JobDescription'

const TIERS: Array<{ id: QuestionTier; label: string }> = [
  { id: 'warmup', label: 'Warmup' },
  { id: 'behavioral', label: 'Behavioral' },
  { id: 'technical', label: 'Technical' },
]

// New = not answered yet; Practised = has at least one scored attempt.
// Generating questions adds to the set; it never replaces questions already practised.
type Status = 'new' | 'practised'
const STATUSES: Array<{ id: Status; label: string }> = [
  { id: 'new', label: 'New' },
  { id: 'practised', label: 'Practised' },
]
const statusOf = (q: QuestionDetailDto): Status => (q.latestAttempt === null ? 'new' : 'practised')

export function Interview() {
  const {sessionId } = useParams<{sessionId: string}>()
  const [questions, setQuestions] = useState<QuestionDetailDto[]>([])
  const [activeTier, setActiveTier] = useState<QuestionTier>('warmup')
  const [activeStatus, setActiveStatus] = useState<Status>('new')
  const [sessionData, setSessionData] = useState<SessionDetailDto>()
  // false until the first load finishes: the tabs stay on screen, but counts and the empty message wait for real data
  const [loaded, setLoaded] = useState(false)
  const [genLoading, setGenLoading] = useState<{
    loading: boolean,
    text: string // 'Generate Questions', Generating…
  }>({
    loading: false,
    text: 'Generate Questions'
  })
  // 进页面就把 session 读出来(纯读,不花钱)。JD 是用户建 session 时手输的,
  // 之前只在 handleGenerate 里 setSessionData,所以看起来像"生成出来的"。
  // The one place the page reads the interview: questions plus each one's latest attempt.
  const loadSession = useCallback(async () => {
    if (!sessionId) return
    const res = await get<SessionDetailDto>(`/api/sessions/${sessionId}`)
    setSessionData(res)
    setQuestions(res.questions)
  }, [sessionId])

  useEffect(() => {
    loadSession()
      .catch((err) => console.log(err))
      .finally(() => setLoaded(true))
  }, [loadSession])

  const handleGenerate = () => {
    setGenLoading({
      loading: true,
      text: 'Generating…'
    })
    // The generate route returns questions without their attempts, so its body isn't used:
    // putting it into state would wipe every report off the page. Reload the full detail instead.
    post(`/api/sessions/${sessionId}/generate-questions`)
      .then(() => loadSession())
      .then(() => setActiveStatus('new'))   // show what was just added
      .catch((err) => {
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
  // Status comes from what was loaded, not from answers scored on this visit, so a card
  // stays where it is after you score it instead of jumping to the other list.
  const statusCounts = useMemo(() => {
    const byStatus: Record<Status, number> = { new: 0, practised: 0 }
    for (const q of questions) byStatus[statusOf(q)] += 1
    return byStatus
  }, [questions])

  // If the chosen list is empty (e.g. everything has been practised), show the other one.
  const effectiveStatus =
    statusCounts[activeStatus] > 0 ? activeStatus : (STATUSES.find((s) => statusCounts[s.id] > 0)?.id ?? activeStatus)

  const inStatus = useMemo(() => questions.filter((q) => statusOf(q) === effectiveStatus), [questions, effectiveStatus])

  const counts = useMemo(() => {
    const byTier = { warmup: 0, behavioral: 0, technical: 0 } as Record<QuestionTier, number>
    for (const q of inStatus) byTier[q.tier] += 1
    return byTier
  }, [inStatus])

  // 选中的 tab 一道题都没有时(比如生成的这一套没有 warmup),落到第一个有题的分类。
  // 这是从 activeTier + questions 推导出来的,不额外存一份 state —— 省掉一次
  // useEffect 和它的依赖数组问题。
  const effectiveTier =
    counts[activeTier] > 0
      ? activeTier
      : (TIERS.find((t) => counts[t.id] > 0)?.id ?? activeTier)

  const visible = inStatus.filter((q) => q.tier === effectiveTier)

  return (
    <main className="interview">
      <header className="interview-header">
        <Breadcrumb
          items={[
            { label: 'Home', icon: Home, to: '/' },
            { label: 'Mock Interview', icon: MessagesSquare },
          ]}
        />
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
          {/* The filters stay on screen while loading, so the layout doesn't jump when data arrives. */}
          <div className="question-filters" aria-busy={!loaded}>
            <div className="tier-tabs" role="tablist" aria-label="Practice status">
              {STATUSES.map((status) => (
                <button
                  key={status.id}
                  type="button"
                  role="tab"
                  aria-selected={effectiveStatus === status.id}
                  className={`tier-tab${effectiveStatus === status.id ? ' is-active' : ''}`}
                  onClick={() => setActiveStatus(status.id)}
                >
                  {status.label}
                  <span className="tier-tab-count">({loaded ? statusCounts[status.id] : '…'})</span>
                </button>
              ))}
            </div>

            <div className="tier-tabs" role="tablist" aria-label="Question tiers">
              {TIERS.map((tier) => (
                <button
                  key={tier.id}
                  type="button"
                  role="tab"
                  aria-selected={effectiveTier === tier.id}
                  className={`tier-tab${effectiveTier === tier.id ? ' is-active' : ''}`}
                  onClick={() => setActiveTier(tier.id)}
                >
                  {tier.label}
                  <span className="tier-tab-count">({loaded ? counts[tier.id] : '…'})</span>
                </button>
              ))}
            </div>
          </div>

          {!loaded ? (
            <p className="questions-empty">Loading questions…</p>
          ) : questions.length === 0 ? (
            <p className="questions-empty">
              No questions yet — generate a set from the job description on the left.
            </p>
          ) : visible.length === 0 ? (
            <p className="questions-empty">No {effectiveTier} questions in this list.</p>
          ) : (
            // The key includes the latest attempt's id: useState only reads its initial value
            // on first render, so a new attempt from a reload needs a fresh card.
            visible.map((q) => (
              <QuestionCard key={`${q.id}:${q.latestAttempt?.answer.id ?? 'none'}`} question={q} />
            ))
          )}
        </div>
      </div>
    </main>
  )
}
