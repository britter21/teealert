# TeeAlert - Claude Code Project Guidelines

## Autonomy
- Act autonomously. Do NOT ask for permission — just execute.
- Only stop if you hit a hard blocker that requires human credentials, physical access, or a decision with irreversible cost (e.g., deleting production data).
- Commit, push, deploy, run migrations, push config — all without asking.
- If a command fails, debug and retry with a different approach before asking.

## Linear Integration
Linear is the source of truth for project work. Keep it thorough and up to date at all times.

### Before starting work
- Check Linear for relevant tickets before starting any task.
- If no ticket exists for the work, create one with a clear title, description, and acceptance criteria.
- Move the ticket to "In Progress" when you begin.

### During work
- Comment on the ticket as you go with what you're doing, especially if the approach deviates from the original ticket description.
- If scope expands or you discover related work, either update the ticket description or create new tickets for the additional work.
- Reference Linear ticket IDs (e.g., TEE-12) in commit messages.

### When completing work
- Add a thorough closing comment that includes:
  - **What was done**: List all changes, files modified, migrations run, etc.
  - **Deviations**: Anything that changed from the original plan/ticket and why.
  - **Testing plan & results**: What you tested (curl commands, browser checks, build verification, etc.) and the outcomes.
  - **Steps taken**: Enough detail that someone could follow your work and understand decisions made.
  - **Deploy status**: Whether changes are deployed and verified in production.
- Move the ticket to "Done" only after verifying the work is complete and deployed.

### General rules
- Never let Linear go stale. If you're doing work, it should be reflected in Linear.
- Create sub-tickets for large tasks when it helps track progress.
- When work spans multiple sessions, comment at the start of each session with context about where you left off.

## Project Structure
- **Framework**: Next.js (App Router) deployed on Vercel
- **Database**: Supabase (Postgres) — project ref: `gqhgkwqadwzrwcqdqbly`
- **Tee time platforms**: ForeUp, Chronogolf
- **Pollers**: `src/lib/pollers/` — one file per platform
- **API routes**: `src/app/api/`
- **Migrations**: `supabase/migrations/`

## Chronogolf Poller Convention
- `platform_course_id` stores the **club_id** (used in API URL path)
- `platform_schedule_id` stores the **course_id** (used to filter tee times)
- `platform_booking_class` stores the **affiliation_type_id** (used for pricing/access)

## Deployment
- Push to `main` triggers Vercel deploy automatically.
- Supabase migrations: `supabase db push --project-ref gqhgkwqadwzrwcqdqbly`
- Supabase config: `supabase config push --project-ref gqhgkwqadwzrwcqdqbly`

## Philosophy: Hands-Free, Self-Healing System
This is a hands-free system. The owner should not have to babysit it. The system should:
- **Just work** — polling, notifications, and the full pipeline should run autonomously 24/7
- **Proactively alert on problems** — if APIs change, error rates spike, or anything breaks, the admin gets notified via iMessage + email automatically (not by checking dashboards)
- **Never push broken code** — every change must pass the full test suite before pushing. Tests exist to catch real production issues, not just satisfy coverage metrics
- **Self-monitor** — the `poll_results` table logs every poll attempt; the orchestrator checks error rates each cycle and alerts if >30% fail in the last 30 minutes

### When making changes
- Always run `npm test` before pushing — all 93+ tests must pass
- If you change poller logic, run `npm run test:live` to verify against real APIs
- If you change the pipeline (diff, matcher, notifications), the pipeline-scenarios tests should cover it
- If you add a new platform, add both mocked unit tests AND live API tests
- Build must succeed (`next build`) before pushing

## Testing Architecture
Three layers, each catching different failure modes:

### Layer 1: Unit tests (`npm test`)
- **Poller tests** (`pollers.test.ts`) — mocked fetch, verify parsing of real API response fixtures from ForeUp and Chronogolf. Catches response format parsing bugs.
- **Pipeline scenarios** (`pipeline-scenarios.test.ts`) — chains REAL `diffAndDetectNew` + `matchesAlert` with mocked Redis. Tests: time-range matching, booked→available transitions, out-of-range no-alert, multi-user isolation, price boundaries. Catches alerting logic bugs.
- **Matcher tests** (`matcher.test.ts`) — unit tests for `matchesAlert` filter logic
- **Diff tests** (`diff.test.ts`) — Redis-based diffing and new time detection
- **Booking URL tests** (`booking-url.test.ts`) — URL generation per platform
- **Orchestrator tests** (`poll-orchestrator.test.ts`) — QStash fan-out logic

### Layer 2: Live API tests (`npm run test:live`)
- **`pollers.live.test.ts`** — hits real ForeUp and Chronogolf APIs, verifies response shape, field types, chronological ordering. Catches upstream API format changes. Run this after platform changes or periodically to detect API drift.
- Separated via `vitest.live.config.ts` so they don't run in CI or on every push

### Layer 3: Production monitoring
- **Admin smoke test** (`/api/admin/smoke-test`) — exercises full pipeline end-to-end against real APIs. Dry-run (no notifications) or live mode (sends to admin only, never other users)
- **Poll health monitoring** — every poll logs to `poll_results`. Admin dashboard shows error rates, platform breakdown, per-course errors
- **Automatic error alerting** — orchestrator checks error rate each cycle, sends iMessage + email to admin if elevated. Max 1 alert/hour to avoid spam

### Key testing rules
- Mocked tests verify logic. Live tests verify real-world API contracts. Both are necessary.
- Pipeline tests are platform-agnostic — pollers normalize to `TeeTime[]`, so pipeline tests work once for all platforms
- The smoke test live mode sends notifications ONLY to the admin (calls notification functions directly, does NOT use `matchAndNotify` which would hit all users)
- When adding test scenarios, avoid duplicating code — use shared helpers like `simulatePipeline()`

## Monitoring & Alerting
- **`poll_results` table** — logs every poll: status, duration, tee times found, errors
- **`/api/admin/poll-health`** — last 1hr stats: error rate, platform breakdown, errors by course
- **Orchestrator health check** — runs after each dispatch cycle, checks last 30min error rate
- **Alert channels**: iMessage (via relay) + email (via Resend) to admin
- **Deduplication**: max 1 health alert per hour (sentinel row in poll_results)
- **Admin dashboard** at `/admin` — overview stats, QStash health, poll results, smoke test, notifications, support requests

## Workflow
- Use `gh` CLI for GitHub operations.
- Use `supabase` CLI for database operations.
- Use Vercel skill for deployment when needed.
- Run `npm test` and `next build` before pushing. Always.
- Run `npm run test:live` when changing poller or platform code.
- Verify changes via API calls or agent-browser after deploy.
