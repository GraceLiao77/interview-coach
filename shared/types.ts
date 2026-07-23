// Shared API request/response types — single source of truth for client and server.

// ---- Health (step 1) ----

export interface HealthResponse {
  status: 'ok';
  timestamp: string;
}

// ---- Auth (step 3) ----

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

/** Public user shape — never includes passwordHash. */
export interface UserDto {
  id: string;
  email: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: UserDto;
}

// ---- Sessions & questions (step 2) ----

export type QuestionTier = 'warmup' | 'behavioral' | 'technical';

export interface QuestionDto {
  id: string;
  tier: QuestionTier;
  text: string;
  order: number;
}

export interface SessionDto {
  id: string;
  jobDescription: string | null;
  status: string;
  createdAt: string;
  questions: QuestionDto[];
}

export interface CreateSessionRequest {
  jobDescription?: string;
  questions?: Array<{
    tier: QuestionTier;
    text: string;
    order: number;
  }>;
}

// ---- Errors ----

export interface ApiError {
  error: string;
}
