# Registration is closed; accounts are invite-only

The owner is the only person using the app, and every model call is paid for with the owner's own API credit. So public sign-up is turned off, and an account exists only if the owner created it. This replaces one sentence of ADR 0002, "Registration stays open"; the rest of ADR 0002 still holds. The register endpoint stays in place, behind a `REGISTRATION_OPEN` flag in `server/src/routes/auth.ts` that is `false` for now. While it is off, the endpoint answers `403 { error: "Registration is invite-only" }` before it reads the body or touches the database. The login page says "Sign-up is invite-only for now. Just looking? Try the demo." and opening `/register` sends the visitor to `/login`. Anyone without an account, including recruiters opening a link from a CV, still gets the Demo Interview.

## Considered Options

- **Keep registration open and let `isAllowed` block the AI routes (ADR 0002 as written).** Rejected. It keeps an endpoint that nobody needs open to bots and password-spraying. It also answers `409 Email already registered`, which tells anyone whether an email has an account, against the rule that the auth routes never reveal that.
- **Registration limited to invited emails** (a list such as `INVITED_EMAILS` in the server config). Deferred. Invited people would set their own password, but adding someone would mean changing the config and redeploying, and the 409 leak would still need fixing. It's worth building only when there is someone to invite.
- **Hiding the sign-up form in the client only.** Rejected. Anyone can call `POST /api/auth/register` directly. The client decides what is shown; only the server decides what is allowed.
- **Showing the sign-up form and rejecting it on submit.** Rejected. A visitor would fill in the form only to be turned away. Saying "invite-only" up front tells them the same thing without wasting their time.

## Consequences

- To add someone for now, the owner inserts the user row by hand in Supabase, with a bcrypt hash and `isAllowed = true`. A `user:create` script is deferred until there is someone to invite.
- `isAllowed` stays. Every account is now one the owner created, but the flag is still the switch that cuts an account off from model calls without deleting it.
- The registration code is kept behind the flag rather than deleted or commented out, so it is still typechecked and reopening sign-up is a one-line change. `registerLimiter` stays for the same reason.
- The Demo Interview and its link are unchanged, and it becomes the main way for anyone else to see the app.
