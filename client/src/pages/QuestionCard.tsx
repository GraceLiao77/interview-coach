import { useState } from 'react'
import type { QuestionDto, ScoreReportDto } from '@shared/types'
import { submitAnswer } from '../api/interview'

const TIER_LABELS: Record<QuestionDto['tier'], string> = {
  warmup: 'Warmup',
  behavioral: 'Behavioral',
  technical: 'Technical',
}

interface QuestionCardProps {
  question: QuestionDto
}

/** 一道题的卡片:自己管「答案输入 / 提交中 / 评分结果」这些 UI 状态。 */
export function QuestionCard({ question }: QuestionCardProps) {
  const [answer, setAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [score, setScore] = useState<ScoreReportDto | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      const res = await submitAnswer(question.id, answer) // 卡片自己调 API
      setScore(res.score)
      
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="q-card">
      <span className="q-tier">{TIER_LABELS[question.tier]}</span>
      <p className="q-text">{question.text}</p>

      <textarea
        className="q-answer"
        rows={4}
        placeholder="Type your answer…"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
      />

      <button
        type="button"
        className="submit-btn"
        disabled={submitting || !answer.trim()}
        onClick={() => void handleSubmit()}
      >
        {submitting ? 'Scoring…' : 'Submit & Score'}
      </button>

      {error && <p className="error">{error}</p>}
      {score && <ScoreCard score={score} />}
    </section>
  )
}

/** 评分卡:三轴分数 + 语言错误表 + 润色版 + 结构范式。纯展示。 */
function ScoreCard({ score }: { score: ScoreReportDto }) {
  return (
    <div className="score-card">
      <div className="axes">
        <Axis label="Content" value={score.contentScore} note={score.contentContext} />
        <Axis label="Language" value={score.languageScore} note={score.languageContext} />
        <Axis label="Delivery" value={score.deliveryScore} note={score.deliveryContext} />
      </div>

      {score.languageErrorList.length > 0 && (
        <div className="lang-errors">
          <h4>Language fixes</h4>
          <table>
            <thead>
              <tr>
                <th>Your words</th>
                <th>Native rewrite</th>
                <th>Pattern</th>
              </tr>
            </thead>
            <tbody>
              {score.languageErrorList.map((e, i) => (
                <tr key={i}>
                  <td className="orig">{e.original}</td>
                  <td className="rewrite">{e.rewrite}</td>
                  <td className="pattern">{e.pattern}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="polished">
        <h4>Polished version</h4>
        <p>{score.polishedVersion}</p>
      </div>

      <div className="exemplar">
        <h4>Structure to aim for</h4>
        <p>{score.structuralExemplar}</p>
      </div>
    </div>
  )
}

/** 单个评分轴:标签 + 分数 + 进度条 + 说明。 */
function Axis({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="axis">
      <div className="axis-head">
        <span className="axis-label">{label}</span>
        <span className="axis-score">
          {value}
          <span className="axis-max">/10</span>
        </span>
      </div>
      <div className="axis-bar">
        <div className="axis-fill" style={{ width: `${value * 10}%` }} />
      </div>
      <p className="axis-note">{note}</p>
    </div>
  )
}
