// Loads .env and validates required variables once, at startup.
// Import this module first in index.ts so env vars exist before anything reads them.
process.loadEnvFile();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name} (check server/.env)`);
  }
  return value;
}

export const env = {
  jwtSecret: required('JWT_SECRET'),
  port: Number(process.env.PORT ?? 3009),
  anthropicApiKey: required('ANTHROPIC_API_KEY'),
  mockAi: process.env.MOCK_AI === 'true', // Claude(出题 / 评分)
  // Groq 转写单独一个开关:可以「转写走真实 API + 评分继续 mock」,验证语音链路时不烧 Claude 的钱。
  // 不设 = false = 走真实 Groq。
  mockTranscription: process.env.MOCK_TRANSCRIPTION === 'true',
  groqApiKey: required('GROQ_API_KEY')
};
