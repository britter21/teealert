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

## Workflow
- Use `gh` CLI for GitHub operations.
- Use `supabase` CLI for database operations.
- Use Vercel skill for deployment when needed.
- Run tests/type-checks before pushing when available.
- Verify changes via API calls or agent-browser after deploy.
