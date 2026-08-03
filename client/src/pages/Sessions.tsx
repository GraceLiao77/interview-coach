import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { CreateSessionRequest, SessionDto } from '@shared/types'
import { api, ApiRequestError } from '../api/client'
import { useAuth } from '../context/AuthContext'

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
    const body: CreateSessionRequest = {
      jobDescription: jobDescription || undefined,
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
      <header className="page-header">
        <h1>Interview Coach</h1>
        <div>
          <span>{user?.email}</span>{' '}
          <button
            type="button"
            onClick={() => {
              logout()
              navigate('/login')
            }}
          >
            Log out
          </button>
        </div>
      </header>

      <section>
        <h2>New mock session</h2>
        <form onSubmit={createSession} className="session-form">
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job description here (optional for now — AI question generation comes in a later step)"
            rows={4}
          />
          <button type="submit">Create session</button>
        </form>
      </section>

      {error && <p className="error">{error}</p>}

      <section>
        <h2>Your sessions</h2>
        {sessions.length === 0 && <p>No sessions yet — create one above.</p>}
        <ul className="session-list">
          {sessions.map((s) => (
            <li key={s.id}>
              <div>
                <strong>{s.status}</strong> · {new Date(s.createdAt).toLocaleString()}
                {s.jobDescription && <p className="jd-preview">{s.jobDescription.slice(0, 120)}…</p>}
                <p>{s.questions.length} questions</p>
              </div>
              <div className="session-actions">
                <button type="button" onClick={() => navigate(`/interview/${s.id}`)}>
                  Practice
                </button>
                <button type="button" onClick={() => void deleteSession(s.id)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
