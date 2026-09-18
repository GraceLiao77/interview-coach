import { useState } from 'react'
import type { QuestionDto, ScoreReportDto } from '@shared/types'
import { submitAnswer, transcribeAudio } from '../api/interview'
import { Recorder } from './Recorder'

const TIER_LABELS: Record<QuestionDto['tier'], string> = {
  warmup: 'Warmup',
  behavioral: 'Behavioral',
  technical: 'Technical',
}

interface QuestionCardProps {
  question: QuestionDto
}

/** 一道题的卡片:自己管「答案输入 / 转写中 / 提交中 / 评分结果」这些 UI 状态。 */
export function QuestionCard({ question }: QuestionCardProps) {
  const [answer, setAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [score, setScore] = useState<ScoreReportDto | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      const res = await submitAnswer(question.id, answer)
      setScore(res.score)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  /** 录音停止 → 只转写,不评分。文字回填进 textarea,用户可以改完再走同一个 Submit。 */
  async function handleAudio(blob: Blob) {
    setTranscribing(true)
    setError(null)
    try {
      const res = await transcribeAudio(question.id, blob)
      setAnswer(res.transcript)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setTranscribing(false)
    }
  }

  const busy = submitting || transcribing

  return (
    <section className="q-card">
      <span className="q-tier">{TIER_LABELS[question.tier]}</span>
      <p className="q-text">{question.text}</p>

      <textarea
        className="q-answer"
        rows={5}
        placeholder="Type your answer, or record it and edit the transcript…"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
      />

      <div className="q-actions">
        <Recorder
          onComplete={(blob) => void handleAudio(blob)}
          disabled={transcribing}
        />

        <button
          type="button"
          className="submit-btn btn-ai"
          disabled={busy || !answer.trim()}
          onClick={() => void handleSubmit()}
        >
          {submitting ? 'Scoring…' : 'Submit & Score'}
        </button>
      </div>

      {error && <p className="error">{error}</p>}
      {score && <ScoreCard score={score} />}
    </section>
  )
}

/** 评分卡:三轴分数 + 语言错误表 + 润色版 + 结构范式。整站黑白,只有这里用颜色。 */
function ScoreCard({ score }: { score: ScoreReportDto }) {
  return (
    <div className="score-card">
      <div className="axes">
        <Axis tone="content" label="Content" value={score.contentScore} note={score.contentContext} />
        <Axis tone="language" label="Language" value={score.languageScore} note={score.languageContext} />
        <Axis tone="delivery" label="Delivery" value={score.deliveryScore} note={score.deliveryContext} />
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

/** 单个评分轴:标签 + 分数 + 进度条 + 说明。tone 决定这一轴的颜色。 */
function Axis({
  tone,
  label,
  value,
  note,
}: {
  tone: 'content' | 'language' | 'delivery'
  label: string
  value: number
  note: string
}) {
  return (
    <div className={`axis axis--${tone}`}>
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
