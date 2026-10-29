import { useCallback, useEffect, useState } from 'react'
import { get, post } from '../api/client'
import type { SessionDetailDto } from '@shared/types'
import './Interview.css'
import { useParams } from 'react-router-dom'
import { Breadcrumb } from '../components/ui/breadcrumb'
import { Home, MessagesSquare } from 'lucide-react'
import { InterviewView } from './InterviewView'

/** The signed-in Interview page: loads the interview from the API and can generate questions.
 *  Everything you see is drawn by InterviewView; this file only fetches the data. */
export function Interview() {
  const { sessionId } = useParams<{ sessionId: string }>()
  //  从后端拿回来的这场面试的全部数据：JD 原文 + 所有题目 + 每道题的回答和报告
  const [sessionData, setSessionData] = useState<SessionDetailDto>()
  //  数据到了没有。false 时右边显示 "Loading questions…"，tab 上的数字显示 (…)；true 时才显示真正的题目
  const [loaded, setLoaded] = useState(false)
  //  Generate 按钮是不是正在转。点了以后按钮变成 "Generating…" 并且不能再点
  const [generating, setGenerating] = useState(false)
  // Why the last Generate failed, e.g. a 403 for an account that isn't allowed to call the model
  const [generateError, setGenerateError] = useState<unknown>(null)

  // The one place the page reads the interview: questions plus each one's latest attempt.
  const loadSession = useCallback(async () => {
    if (!sessionId) return
    const res = await get<SessionDetailDto>(`/api/sessions/${sessionId}`)
    setSessionData(res)
  }, [sessionId])

  useEffect(() => {
    loadSession()
      .catch((err) => console.log(err))
      .finally(() => setLoaded(true))
  }, [loadSession])

  // 点 Generate 按钮时执行的函数，它会调用后端，让 Claude 出题（花钱）
  // It returns the promise, so the view can wait for it and then switch to the New tab.
  const handleGenerate = async () => {
    setGenerating(true)
    setGenerateError(null)
    try {
      // The generate route returns questions without their attempts, so its body isn't used:
      // putting it into state would wipe every report off the page. Reload the full detail instead.
      await post(`/api/sessions/${sessionId}/generate-questions`)
      await loadSession()
    } catch (err) {
      setGenerateError(err)
    } finally {
      setGenerating(false)
    }
  }

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

      <InterviewView session={sessionData} loaded={loaded} generating={generating} onGenerate={handleGenerate} generateError={generateError} />
    </main>
  )
}
