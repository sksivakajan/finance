# Phases 2–4 Review — Security & UX

Closes out Phases 2–4 the same way `docs/PHASE1_REVIEW.md` closed out Phase 1.
Covers everything built since: friends, chat, notifications (Phase 2); shared
expenses, splitting, groups, money requests, settlements, balances (Phase 3);
cash-flow and loan-payoff forecasting (Phase 4).

## Security review

Full pass against the same 9-item checklist as the Phase 1 review, done by an
independent review agent with no access to the implementation history — just
the current code, re-verified from scratch rather than assuming Phase 1's
pass carries over.

| Check | Result |
|---|---|
| Raw/unsafe SQL | **Pass** — the only `$queryRaw` in the tree is still the Phase 1 health check (no interpolation); zero raw SQL anywhere in the Phase 2–4 modules |
| XSS | **Pass** — no `dangerouslySetInnerHTML`/`innerHTML`/`eval` anywhere in `apps/web`; chat message bodies render as plain React text (auto-escaped); `attachmentUrl` is only ever used as a template-concatenated `src`/`href`, never interpolated into an executable context |
| Object-level authorization | **Fixed during review** — every by-ID route (expense, group, chat, money-request, settlement, forecast) correctly re-checks ownership/participant/group-member/conversation-member status server-side. But three of the profile privacy settings the checklist specifically calls out were stored and returned by the API yet never actually enforced: a `whoCanSeeProfile: FRIENDS` profile was still fully discoverable by strangers via friend search; `whoCanMessage` was dead code — a friend could always open a DM even after the target set messaging to `NOBODY`; `whoCanAddToGroups` was likewise dead — any friend could add another friend to a group regardless of that setting. All three fixed (see below) |
| Secrets | **Pass** — no hardcoded secrets in any Phase 2–4 module; all config flows through `EnvService`/`process.env` |
| Mass assignment | **Pass** — every write endpoint (expense, group, money-request, settlement, chat) goes through a Zod schema before hitting Prisma's `data:`; none expose `ownerId`/`payerId` as an arbitrary client-supplied identity or a settlement/notification's own `id`/`readAt` — `payerId`/`participantIds` are always cross-checked against the friend/group-membership graph server-side before being trusted |
| Rate limiting coverage | **Fixed during review** — auth, `friends/search`, and `friends/requests` already had `@RateLimit`; `POST /conversations/:id/messages` (chat send) had none, making it a clean spam/harassment vector against a specific friend. Added `@RateLimit({ points: 60, windowSeconds: 60 })`. (Expense/group/settlement/money-request creation remain unlimited, matching Phase 1's own precedent for income/expense creation — accepted as lower-risk than a repeatable per-target social action) |
| Currency/money correctness | **Pass** — `split-engine.ts` is 100% BigInt arithmetic with an invariant-sum assertion before every return; `balance.service.ts` and `forecast.service.ts` use BigInt exclusively for all money math, only converting to string at the JSON response boundary |
| Error handling | **Pass** — the global exception filter still catches everything and reduces non-`HttpException` errors to a fixed generic 500; "not found" paths across the new modules return the same generic code regardless of whether a resource is missing vs. exists-but-unauthorized, so no existence detail leaks |
| Upload/file-serving endpoint | **Pass** — the filename/user-id regexes reject any path-traversal payload, plus a redundant path-containment check; Phase 2 chat attachments reuse the exact same `/uploads` endpoint and convention as Phase 1 receipts, one code path applied consistently |

**Net result:** three real gaps found and closed — two unenforced privacy
settings (profile visibility leaking through search; messaging/group-invite
opt-outs being silently ignored) and one missing rate limit (chat message
spam). Fixes:
- `friend.service.ts` — search now also excludes `FRIENDS`-restricted
  profiles unless the searcher is already a friend; added
  `allowsMessagesFrom()`/`allowsBeingAddedToGroups()` to back the
  previously-dead `whoCanMessage`/`whoCanAddToGroups` fields
- `chat.service.ts` — starting/re-fetching a conversation now rejects with
  `MESSAGING_NOT_ALLOWED` if the target has set `whoCanMessage: NOBODY`
- `chat.controller.ts` — rate limit added to message sending
- `group.service.ts` — both group creation and `addMember` now reject
  inviting someone who has set `whoCanAddToGroups: NOBODY`
- New e2e coverage for all three, added to the existing spec files in their
  established style, each restoring the profile setting it changed afterward
  so it doesn't affect later tests in the same file

## UX review

Verified in a real browser (headless Edge via Playwright) against a brand
new, completely empty account — every Phase 2–4 screen's empty state, two
error-handling paths, and mobile viewport (390×844) reflow.

**Confirmed working end-to-end:**
- Friends, Chat, Balances, Groups, and Forecast all show specific,
  non-generic empty-state copy ("All settled up. Split an expense with a
  friend and the balance will show up here.", "Nothing scheduled ahead. Add
  recurring income/expenses...")
- Full split-and-settle-up loop verified live in-browser during Phase 3/4
  work: equal/percentage splits compute correctly on both sides of a
  friendship, settling up zeroes the balance, group expenses produce correct
  per-member balances, and the debt-simplification suggestion matches by
  hand
- Mobile viewport: all five new pages reflow to a full-width single column
  with no overflow; the bottom icon nav (grew from 7 to 10 items across
  Phases 2–4) still fits without clipping, confirmed by screenshot at each
  addition

**Found and fixed:** two pages had no error state at all for an
inaccessible/nonexistent resource, discovered by navigating directly to a
made-up ID rather than only exercising the "happy path" links:
- `/groups/[groupId]` checked `isLoading || !group` to decide whether to show
  a spinner — but once a query's retries are exhausted after a real error,
  `isLoading` goes false while `data` stays `undefined` forever, so the
  spinner never went away. Fixed to check `isError` explicitly and show a
  "Group not found" state instead.
- `/chat/[conversationId]` didn't check its query's error state at all — a
  nonexistent or inaccessible conversation rendered a fully live, empty
  message composer ("No messages yet. Say hello." plus a working text input
  and Send button) with no indication anything was wrong. A user could type
  and hit Send into a conversation that silently can't work. Fixed the same
  way, with a "Conversation not found" state and a back link.

**Noted, not fixed (cosmetic, not a defect):** the same black circular icon
from the Phase 1 review's screenshots is still present in every screenshot's
top-left corner — still Edge's own browser chrome, not the app.

**Out of scope for this pass:** keyboard-navigation/screen-reader audit
(unchanged from Phase 1's scoping); the chat message-editor's own error
states (attachment upload failure, send failure) were exercised functionally
during Phase 2/3 work but not re-swept here.

## Infrastructure finding (found while verifying the above)

`pnpm run test:e2e` was flaky under Jest's default worker parallelism on
this machine — 3 separate occurrences this session of ~14/57 tests failing
with connection/timeout errors that don't reproduce at all under
`--runInBand`. Not a code bug: Postgres's `max_connections` (100) and actual
concurrent connection count (~11 at rest) both have headroom, so this is
most likely CPU/IO contention from bootstrapping 6–7 full NestJS
app-plus-Prisma-pool instances at once on this specific dev machine, not a
resource ceiling that would necessarily reproduce on a better-provisioned
CI runner. Bisected the actual reliable threshold on this machine
(`--maxWorkers=3` still fails, `--maxWorkers=2` passes cleanly twice in a
row) and made `--maxWorkers=2` the permanent default in `test:e2e`'s script
definition, so the plain `pnpm run test:e2e` command is reliable without
requiring `--runInBand` (56–77s instead of a ~9s best case, but actually
passing beats being fast and flaky).

## Verification

- 57 e2e tests + 30 api unit tests + 40 shared unit tests, all passing —
  independently re-run twice after the agent's fixes, not just trusting its
  own report
- Full lint clean (`eslint` on both `apps/api` and `apps/web`)
- Full typecheck clean (`tsc --noEmit` on both `apps/api` and `apps/web`)
- Full production build clean (`next build`, `nest build`)
- Manual browser walkthrough completed against the real local stack

Phases 1–4 (the full master plan) are now complete and reviewed.
