import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import type { AuthResponse, LoginRequest, RegisterRequest, UserDto } from '@shared/types'
import { api, clearToken, getToken, setToken } from '../api/client'

const USER_KEY = 'interview-coach-user'

interface AuthContextValue {
  user: UserDto | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function loadStoredUser(): UserDto | null {
  if (!getToken()) return null
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as UserDto
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(loadStoredUser)

  function applyAuth(auth: AuthResponse): void {
    setToken(auth.token)
    localStorage.setItem(USER_KEY, JSON.stringify(auth.user))
    setUser(auth.user)
  }

  async function login(email: string, password: string): Promise<void> {
    const body: LoginRequest = { email, password }
    applyAuth(await api<AuthResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }))
  }

  async function register(email: string, password: string): Promise<void> {
    const body: RegisterRequest = { email, password }
    applyAuth(await api<AuthResponse>('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }))
  }

  function logout(): void {
    clearToken()
    localStorage.removeItem(USER_KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
