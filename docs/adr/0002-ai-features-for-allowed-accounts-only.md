# AI features run only for allowed accounts; everyone else sees a recorded demo

Every model call is paid for with the owner's own API credit, so the app is used by its owner for now. Generating questions, transcribing and scoring only run for accounts on an allowlist kept in server config. Anyone else, including recruiters opening a link from a CV, gets a Demo Interview: one real interview recorded earlier, with real model output, that makes no model calls and needs no sign-in. Registration stays open, but an account that isn't allowed gets a clear "invite only" message from the AI routes rather than an error.

## Considered Options

- **Bring your own key (BYOK).** Each user supplies their own Anthropic key, sent with each request and never stored. Deferred, not rejected: nobody else uses the app yet, and most target users (job-seeking engineers) don't have an API key. If it's built later, the key must stay in the browser (sessionStorage), be used through a client created per request (a shared client would let one user's request run on another user's key, because requests interleave on Node's event loop), and must never reach a log.
- **Storing users' keys on the server, encrypted.** Rejected. It would make the app the custodian of other people's money, and a server breach could expose every stored key.
- **Calling Anthropic directly from the browser.** Rejected. The server could no longer trust the scores it stores.
- **Charging users.** Left for later, once people other than the owner find the app useful.

## Consequences

- Rate limits still apply. Auth routes are limited against password guessing, and AI routes are limited against the owner's own bugs, such as a client loop or a double-clicked button. The Anthropic Console's monthly spend limit is the last line of defence, and it holds even if the app has a bug.
- Groq transcription is free, but it is gated by the same allowlist, so it can't be abused either.
