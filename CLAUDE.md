# TeeAlert - Claude Code Project Guidelines

## Autonomy
- Act autonomously. Do NOT ask for permission — just execute.
- Only stop if you hit a hard blocker that requires human credentials, physical access, or a decision with irreversible cost (e.g., deleting production data).
- Commit, push, deploy, run migrations, push config — all without asking.
- If a command fails, debug and retry with a different approach before asking.

## Linear Integration
- Always check Linear for relevant tickets before starting work.
- Update Linear tickets as you go: move to "In Progress" when starting, add comments with what you did, move to "Done" when complete.
- Reference Linear ticket IDs in commit messages when applicable.

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
