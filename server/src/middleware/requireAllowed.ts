import type { NextFunction, Request, Response } from 'express';

// Model calls are paid for with the owner's own API credit, so they only run for
// Allowed Accounts (ADR 0002). Must run after requireAuth, which sets req.isAllowed.
//
// The flag is read from the JWT, so no database lookup is needed per request.
// The trade-off: a change to User.isAllowed only takes effect at the next login,
// so removing someone from the allowlist doesn't cut them off until their token
// expires (7 days).
export function requireAllowed(req: Request, res: Response, next: NextFunction): void {
    if (req.isAllowed === true) {
        next();
        return;
    }
    // 403, not 401: we know who this is; they just aren't allowed to do this.
    res.status(403).json({
        error: 'AI features are invite-only for now, because every request is paid for by the site owner. You can still look around and try the demo.',
    });
}
