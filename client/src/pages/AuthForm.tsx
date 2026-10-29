import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MessagesSquare } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

interface AuthFormProps {
  mode: 'login' | 'register'
}

export function AuthForm({ mode }: AuthFormProps) {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await (mode === 'login' ? login(email, password) : register(email, password))
      navigate('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <header className="auth-brand">
          <span className="auth-logo" aria-hidden="true">
            <MessagesSquare size={20} strokeWidth={2} />
          </span>
          <h1 className="auth-title">Interview Coach</h1>
          <p className="auth-tagline">Mock interviews for engineers who speak English as a second language.</p>
        </header>

        <section className="auth-card">
          <h2 className="auth-heading">{mode === 'login' ? 'Log in' : 'Create an account'}</h2>
          <form onSubmit={handleSubmit} className="auth-form">
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </label>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button type="submit" className="submit-btn auth-submit" disabled={busy}>
              {mode === 'login' ? (busy ? 'Logging in…' : 'Log in') : busy ? 'Registering…' : 'Register'}
            </button>
          </form>
        </section>

        {mode === 'login' ? (
          // Sign-up is closed (ADR 0003), so point everyone else at the demo
          <p className="auth-footer">
            Sign-up is invite-only for now. Just looking? <Link to="/demo">Try the demo</Link>.
          </p>
        ) : (
          <p className="auth-footer">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        )}
      </div>
    </main>
  )
}
