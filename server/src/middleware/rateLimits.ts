import { rateLimit, ipKeyGenerator } from 'express-rate-limit';

// rateLimit() builds the middleware for us: it counts requests per key inside a time
// window, and once the count passes `limit` it answers 429 itself, so the route never runs.
//
// Counts live in memory, per server instance, and reset on every restart. That's fine
// with one instance. With several, each would count separately, so the store would
// need to move to something shared, such as Redis.
//
// Behind a proxy (App Runner's load balancer, CloudFront), req.ip is the proxy's
// address until Express is told how many proxies to trust ('trust proxy').
// Set that at deploy time from what req.ip and X-Forwarded-For actually show.

const common = {
    standardHeaders: 'draft-8' as const,   // tells the client its limit and when it resets
    legacyHeaders: false,
};

// Login: by IP, because before login we don't know who the caller is.
// Only failed attempts count, so password guessing is slowed down but a user who
// logs in successfully is never locked out.
export const loginLimiter = rateLimit({
    ...common,
    windowMs: 10 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    message: { error: 'Too many failed sign-in attempts. Please wait about 10 minutes and try again.' },
});

// Register: by IP, and every attempt counts. Skipping successful ones here would let
// a script create unlimited accounts.
export const registerLimiter = rateLimit({
    ...common,
    windowMs: 60 * 60 * 1000,
    limit: 5,
    message: { error: 'Too many sign-ups from this network. Please try again in an hour.' },
});

// AI routes: by user, so these must run after requireAuth (which sets req.userId) and
// after requireAllowed (so turned-away accounts don't use up a count). They guard against
// the owner's own bugs, such as a client loop or a double-clicked button.
// Each rateLimit() call has its own counter, so the two limits below are independent.
// Claude calls (generating questions, scoring an answer): the expensive ones.
export const aiLimiter = rateLimit({
    ...common,
    windowMs: 60 * 1000,
    limit: 4,
    keyGenerator: (req) => req.userId ?? ipKeyGenerator(req.ip ?? ''),
    message: { error: 'Too many scoring requests in a short time. Please wait a minute and try again.' },
});

// Transcription only (Groq, free tier): cheaper, and re-recording an answer is normal,
// so it gets a higher limit.
export const transcribeLimiter = rateLimit({
    ...common,
    windowMs: 60 * 1000,
    limit: 10,
    keyGenerator: (req) => req.userId ?? ipKeyGenerator(req.ip ?? ''),
    message: { error: 'Too many transcriptions in a short time. Please wait a minute and try again.' },
});
