import { useMemo, useState } from 'react'
import type { QuestionDetailDto, QuestionTier, SessionDetailDto } from '@shared/types'
import { QuestionCard } from './QuestionCard'
import { JobDescription } from './JobDescription'
import { LiquidMetalButton } from '../components/ui/liquid-metal-button'

/**
 * Draws an Interview: the job description, the filter tabs and the question cards.
 * It doesn't know where the data came from; the page that renders it does the fetching.
 *
 *  访问 /interview/abc123  →  App.tsx 的路由  →  Interview.tsx（调用后端拿数据）─┐
 *                                                                              ├→ InterviewView 画页面
 *  访问 /demo              →  App.tsx 的路由  →  DemoPage.tsx（读 JSON 文件）  ─┘
 */

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

// One shared empty list for "no data yet". `session?.questions ?? []` would make a new
// array on every render, and useMemo would then recompute every time (see the deps below).
const NO_QUESTIONS: QuestionDetailDto[] = []

interface InterviewViewProps {
  /** undefined until the page has loaded it */
  session: SessionDetailDto | undefined
  loaded: boolean
  generating: boolean
  /** Generates more questions. Resolves when the new questions are on the page. */
  onGenerate?: () => Promise<void>
  readOnly?: boolean
  generateError?: string | null
}

export function InterviewView({ session, loaded, generating, onGenerate, readOnly = false, generateError }: InterviewViewProps) {
  const questions = session?.questions ?? NO_QUESTIONS
  // 第二排 tab 你点了哪个（Warmup / Behavioral / Technical）
  const [activeTier, setActiveTier] = useState<QuestionTier>('warmup')
  // 第一排 tab 你点了哪个（New / Practised）
  const [activeStatus, setActiveStatus] = useState<Status>('new')

  // The tab state lives here, so switching to New after generating happens here too.
  const handleGenerate = () => {
    onGenerate?.().then(() => setActiveStatus('new'))   // show what was just added
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

  // 每个 tab 括号里的数字
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
    <div className="interview-body">
      {/* 左栏:JD + 正下方等宽的生成按钮 */}
      <aside className="jd-panel">
        {session?.jobDescription ? (
          <>
            <h2 className="jd-title">Job description</h2>
            <JobDescription text={session.jobDescription} />
          </>
        ) : (
          <p className="jd-empty">No job description on this session.</p>
        )}

        {!readOnly && <>
          <LiquidMetalButton disabled={generating} onClick={handleGenerate}>
            {generating ? 'Generating…' : 'Generate Questions'}
          </LiquidMetalButton>
          {generateError && <div role="alert" className="error">{generateError}</div>}
        </>}
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
            <QuestionCard readOnly={readOnly} key={`${q.id}:${q.latestAttempt?.answer.id ?? 'none'}`} question={q} />
          ))
        )}
      </div>
    </div>
  )
}
