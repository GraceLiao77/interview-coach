import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { CreateSessionRequest, SessionDto } from '@shared/types'
import { api, ApiRequestError } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { normalizeJobDescription } from '../utils/jobDescription'
import { Breadcrumb } from '../components/ui/breadcrumb'
import { Home } from 'lucide-react'

export function Sessions() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<SessionDto[]>([])
  const [jobDescription, setJobDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleApiError = useCallback(
    (err: unknown): void => {
      if (err instanceof ApiRequestError && err.status === 401) {
        logout()
        navigate('/login')
        return
      }
      setError(err instanceof Error ? err.message : String(err))
    },
    [logout, navigate],
  )

  const refresh = useCallback((): void => {
    api<SessionDto[]>('/api/sessions').then(setSessions).catch(handleApiError)
  }, [handleApiError])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function createSession(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    // 粘贴过来的 JD 先规范化成 markdown-lite 再存,否则库里就是一大坨没有结构的文本
    const normalized = normalizeJobDescription(jobDescription)
    const body: CreateSessionRequest = {
      jobDescription: normalized || undefined,
    }
    try {
      await api<SessionDto>('/api/sessions', { method: 'POST', body: JSON.stringify(body) })
      setJobDescription('')
      refresh()
    } catch (err: unknown) {
      handleApiError(err)
    }
  }

  async function deleteSession(id: string): Promise<void> {
    try {
      await api<void>(`/api/sessions/${id}`, { method: 'DELETE' })
      refresh()
    } catch (err: unknown) {
      handleApiError(err)
    }
  }

  return (
    <main>
      <header className="home-header">
        <Breadcrumb items={[{ label: 'Home', icon: Home }]} />
        <div className="home-user">
          <span>{user?.email}</span>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => {
              logout()
              navigate('/login')
            }}
          >
            Log out
          </button>
        </div>
      </header>

      <section className="panel">
        <h2 className="panel-title">New mock session</h2>
        <form onSubmit={createSession} className="session-form">
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job description here — it's what the questions get generated from."
            rows={5}
          />
          <button type="submit" className="submit-btn">
            Create session
          </button>
        </form>
      </section>

      {error && <p className="error">{error}</p>}

      <section>
        <h2 className="panel-title">Your sessions</h2>
        {sessions.length === 0 ? (
          <p className="empty-note">No sessions yet — create one above.</p>
        ) : (
          <ul className="session-list">
            {sessions.map((s) => (
              <li key={s.id} className="session-card">
                <div>
                  <div className="session-meta">
                    <span className="session-status">{s.status}</span>
                    <span>{new Date(s.createdAt).toLocaleString()}</span>
                  </div>
                  {s.jobDescription && (
                    <p className="jd-preview">{s.jobDescription.slice(0, 140).replace(/^##\s*/gm, '')}…</p>
                  )}
                  <p className="session-count">{s.questions.length} questions</p>
                </div>
                <div className="session-actions">
                  <button
                    type="button"
                    className="submit-btn"
                    onClick={() => navigate(`/interview/${s.id}`)}
                  >
                    Practice
                  </button>
                  <button
                    type="button"
                    className="ghost-btn ghost-btn--danger"
                    onClick={() => void deleteSession(s.id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
