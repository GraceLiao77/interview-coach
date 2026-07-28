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
  port: Number(process.env.PORT ?? 3000),
  anthropicApiKey: required('ANTHROPIC_API_KEY'),
  mockAi: process.env.MOCK_AI === 'true',
};
