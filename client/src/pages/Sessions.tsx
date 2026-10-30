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
  // false until the first load finishes, so "still loading" isn't shown as "no sessions"
  const [loaded, setLoaded] = useState(false)
  const [jobDescription, setJobDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState<boolean>(false)

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
    api<SessionDto[]>('/api/sessions')
      .then(setSessions)
      .catch(handleApiError)
      .finally(() => setLoaded(true))
  }, [handleApiError])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function createSession(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    setCreating(true)
    // 粘贴过来的 JD 先规范化成 markdown-lite 再存,否则库里就是一大坨没有结构的文本
    const normalized = normalizeJobDescription(jobDescription)
    const body: CreateSessionRequest = {
      jobDescription: normalized,
    }
    try {
      await api<SessionDto>('/api/sessions', { method: 'POST', body: JSON.stringify(body) })
      setJobDescription('')
      refresh()
    } catch (err: unknown) {
      handleApiError(err)
    } finally {
      setCreating(false)
    }
  }

  // Which card is being deleted, so only its button is disabled and shows "Deleting…"
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function deleteSession(id: string): Promise<void> {
    setDeletingId(id)
    try {
      await api<void>(`/api/sessions/${id}`, { method: 'DELETE' })
      // The server confirmed it, so drop the card here instead of reloading the whole list:
      // refresh() can't be awaited, and the button would flash back to "Delete" in between.
      setSessions((prev) => prev.filter((s) => s.id !== id))
    } catch (err: unknown) {
      handleApiError(err)
    } finally {
      setDeletingId(null)
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
        <h2 className="panel-title">New mock interview</h2>
        <form onSubmit={createSession} className="session-form">
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job description here — it's what the questions get generated from."
            rows={5}
          />
          <button disabled={creating || Boolean(jobDescription.trim())} type="submit" className="submit-btn">
            {creating ? 'Creating' : 'Create Interview'}
          </button>
        </form>
      </section>

      {error && <p className="error">{error}</p>}

      <section>
        <h2 className="panel-title">Your interviews</h2>
        {!loaded ? (
          <p className="empty-note">Loading your interview...</p>
        ) : sessions.length === 0 ? (
          <p className="empty-note">No interview yet — create one above.</p>
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
                    disabled={s.id === deletingId}
                    onClick={() => void deleteSession(s.id)}
                  >
                    {s.id === deletingId ? 'Deleting…' : 'Delete'}
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
