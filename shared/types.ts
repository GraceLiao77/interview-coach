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

// ---- Answers & scoring (step 4) ----

export interface AnswerDto {
  id: string;
  questionId: string;
  content: string;
  createdAt: string;
}

/** One ESL language mistake: the user's words, a native rewrite, and the pattern name. */
export interface LanguageError {
  original: string;
  rewrite: string;
  pattern: string;
}

export interface ScoreReportDto {
  id: string;
  answerId: string;
  contentScore: number;
  languageScore: number;
  deliveryScore: number;
  contentContext: string;
  languageContext: string;
  deliveryContext: string;
  languageErrorList: LanguageError[];
  polishedVersion: string;
  structuralExemplar: string;
  createdAt: string;
}

/** Response of POST /api/questions/:id/answers */
export interface SubmitAnswerResponse {
  answer: AnswerDto;
  score: ScoreReportDto;
}

// ---- Errors ----

export interface ApiError {
  error: string;
}
