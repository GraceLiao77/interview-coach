import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { env } from '../env';
import { loginLimiter, registerLimiter } from '../middleware/rateLimits';
import type { AuthResponse, UserDto } from '@shared/types';

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
});

function buildAuthResponse(user: { id: string; email: string; isAllowed: boolean; createdAt: Date }): AuthResponse {
  const token = jwt.sign({ userId: user.id, isAllowed: user.isAllowed }, env.jwtSecret, { expiresIn: '7d' });
  const userDto: UserDto = {
    id: user.id,
    email: user.email,
    isAllowed: user.isAllowed,
    createdAt: user.createdAt.toISOString(),
  };
  return { token, user: userDto };
}

export const authRouter = Router();

// Registration is temporarily disabled (ADR 0003) . Set this to true to reopen it.
const REGISTRATION_OPEN = false
authRouter.post('/register', registerLimiter, async (req, res) => {
  if (!REGISTRATION_OPEN) {
    res.status(403).json({ error: 'Registration is invite-only' });
    return;
  }
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
    return;
  }
  const email = parsed.data.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.user.create({ data: { email, passwordHash } });
  res.status(201).json(buildAuthResponse(user));
});

authRouter.post('/login', loginLimiter, async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid email or password format' });
    return;
  }
  const email = parsed.data.email.toLowerCase();

  const user = await prisma.user.findUnique({ where: { email } });
  // Same message for "no such user" and "wrong password" — don't leak which emails exist.
  const valid = user && (await bcrypt.compare(parsed.data.password, user.passwordHash));
  if (!user || !valid) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  res.json(buildAuthResponse(user));
});
