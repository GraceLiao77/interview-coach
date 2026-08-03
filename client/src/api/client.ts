import type { ApiError } from '@shared/types'

const API_BASE = 'http://localhost:3009'
const TOKEN_KEY = 'interview-coach-token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export class ApiRequestError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
  }
}

/** Fetch wrapper: prefixes the API base URL, sends JSON, attaches the JWT if present. */
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  // tell service type is json
  headers.set('Content-Type', 'application/json')
  // get token from localstorage
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (res.status === 204) return undefined as T // no content: delete successful

  const body: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    const message = (body as ApiError | null)?.error ?? `HTTP ${res.status}`
    throw new ApiRequestError(res.status, message)
  }
  return body as T
}

export async function get<T>(path: string): Promise<T> {
  return api<T>(path)
}

export async function post<T>(path: string, body?: unknown): Promise<T> {
    return api<T>(path, {
      method: 'POST',
      ...(body !== undefined && {body: JSON.stringify(body)})
    })
}