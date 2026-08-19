# Phase 1 Review — Security & UX (Steps 19–20)

Closes out Phase 1 per docs/BLUEPRINT.md §16/§54. Covers everything built in
Steps 1–18: auth, user/profile, categories, income, expenses, scheduled
payments, loans, dashboard/reports, and the Next.js frontend.

## Security review

Full pass against the §18 threat model and §8 auth architecture, done by an
independent review agent with no access to the implementation history —
just the current code. Nine checklist items, each requiring concrete
file/line evidence, not narrative confidence:

| Check | Result |
|---|---|
| Raw/unsafe SQL | **Pass** — one `$queryRaw` in the whole tree (health check, no interpolation); no `$queryRawUnsafe`/`$executeRawUnsafe` anywhere |
| XSS | **Pass** — no `dangerouslySetInnerHTML`/`innerHTML`/`eval` in apps/web |
| Object-level authorization | **Pass** — every by-ID route goes through an `assertOwnership(userId, id)` check or a `userId`-scoped query before touching the resource; global deny-by-default `JwtAuthGuard` covers everything not marked `@Public()` |
| Secrets | **Pass** — no hardcoded secrets; all required via env with no defaults, `EnvService` fails fast at boot if missing; `.env`/`.env.test` untracked |
| Password/token handling | **Pass** — `passwordHash` never appears in any response (explicit whitelist in `toPublicView`); refresh tokens and 2FA secrets stored only as hashes/encrypted; recovery codes shown once at generation, never again |
| Mass assignment | **Pass** — every write goes through a Zod schema (default strip-unknown-keys behavior, no `.passthrough()` anywhere) before reaching Prisma's `data:` |
| Rate limiting coverage | **Fixed during review** — register/login/verify/resend/forgot/reset all covered; `2fa/verify` and `2fa/disable` were missing it (brute-forceable 6-digit code, gated only by a valid access token) — added `@RateLimit({ points: 10, windowSeconds: 60 })` to both |
| CORS/cookies | **Pass** — `CORS_ORIGIN` is a required, validated single URL (never wildcard) with `credentials: true`; refresh cookie is `httpOnly` + `sameSite: strict` + `secure` in production |
| Error handling | **Pass** — unhandled exceptions are logged in full server-side but the client only ever receives a fixed generic 500 payload, never a stack trace or internal message |

**Net result:** no open findings. One gap found and closed (2FA rate
limiting) during the review itself.

## UX review

Verified in a real browser (headless Edge via Playwright, since this
machine has no `chromium-cli`/Docker) rather than just reading the code —
registered a fresh account, pulled the verification link from the API's
console-driver log, verified, logged in, and drove the dashboard and income
pages including creating a real record.

**Confirmed working end-to-end:**
- Register → gated pre-verification login → verify → login → dashboard,
  all rendering correctly with real data (money round-trips exactly:
  entered `1500.00`, displayed back as `LKR 1,500.00`)
- Empty states render with the specific, non-generic copy the spec asked
  for ("You're all clear. No upcoming payments in the next 30 days.",
  "No income yet. Record your first income...")
- Mobile viewport (390×844): auth pages reflow cleanly to a full-width
  card, no overflow, no cut-off controls
- Category dropdown, native date input, currency-labeled amount field all
  functional on the income form

**Found and fixed:** `/reset-password` rendered the full "choose a new
password" form even when visited with no `?token=` — a stale/reused/
copy-pasted-wrong link showed a normal-looking form instead of failing
clearly, and the user would only find out something was wrong after
filling it in and submitting. `/verify-email` already had this handled
correctly (upfront invalid-link state); `/reset-password` didn't. Fixed to
match: an immediate "Invalid reset link" state with a link to request a
new one, instead of a validation error surfaced only after submit.

**Noted, not fixed (cosmetic, not a defect):** a black circular icon
appeared in every screenshot's bottom-left corner. Traced this to Edge's
own browser chrome, not the app — it's present identically on the
pre-login register page, before any app-rendered sidebar exists at that
screen position. No code change made.

**Out of scope for this pass:** full keyboard-navigation and screen-reader
audit (WCAG per §33), and the remaining CRUD screens beyond income/
dashboard (expenses/scheduled-payments/loans were screenshotted for layout
only, not exercised interactively). Worth a follow-up pass once Phase 2/3
add more screens to review in the same sweep.

## Verification

- 76 automated tests passing (26 api unit, 28 api e2e, 22 shared unit)
- Full workspace build clean (`pnpm build`)
- Full lint clean (`pnpm --filter @finance/api lint`)
- Manual browser walkthrough completed against the real local stack
  (portable Postgres/Redis, no Docker on this machine)

Phase 1 is complete. Next: Phase 2 (friends, chat, notifications) per
docs/BLUEPRINT.md §55.
