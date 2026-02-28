# Tee Time Alert Micro SaaS — Architecture Plan

## Context

We reverse-engineered two major golf booking platform APIs:
- **ForeUp** (used by ~3,000+ courses): Public REST API, requires mobile UA to bypass WAF
- **Chronogolf/Lightspeed** (used by ~1,500+ courses): Public REST API, no WAF issues

Both return JSON with tee time availability, pricing, and player slot info — no auth required for reads. The opportunity: golfers at popular courses (like Black Desert at $421/round) need to book the instant their window opens (e.g., exactly 30 days out). A polling service that detects new availability and pushes alerts in seconds wins.

---

## Environment Setup Status

> Completed 2026-02-28

| Item | Status | Details |
|------|--------|---------|
| Git repo | Done | `~/git/TeeAlert/`, remote: `https://github.com/britter21/teealert` |
| `.env.local` | Done | Supabase, Upstash Redis, Upstash QStash, Vercel, Polar.sh, Linear |
| `.env.local.example` | Done | Secret-free template committed |
| `.gitignore` | Done | Node/Next.js template, `.env.local` excluded |
| Supabase CLI | Done | Linked to project `gqhgkwqadwzrwcqdqbly` |
| Vercel CLI | Done | Authenticated as `britter21` |
| Supabase connectivity | Verified | REST API HTTP 200 |
| Upstash Redis | Verified | PING → PONG |
| Upstash QStash | Verified | API HTTP 200 |
| Linear MCP | Done | Connected for task tracking |

### Claude Code Plugins Installed

| Plugin | Source | Purpose |
|--------|--------|---------|
| `frontend-design` | `anthropics/claude-code` | Production-grade UI design guidance |
| `agent-browser` | `vercel-labs/agent-browser` | Headless browser automation & testing |
| `supabase` | `claude-plugins-official` | Supabase MCP integration |
| `vercel` | `claude-plugins-official` | Vercel MCP integration |
| `typescript-lsp` | `claude-plugins-official` | TypeScript language server for code intelligence |
| `linear` | `claude-plugins-official` | Linear project management integration |

### Local Skills

| Skill | Location | Purpose |
|-------|----------|---------|
| `frontend-design-ultimate` (kesslerio) | `.claude/skills/frontend-design-ultimate/` | Anti-AI-slop static site design with React/Tailwind/shadcn |

### CLI Tools

| Tool | Version | Purpose |
|------|---------|---------|
| `agent-browser` | Global npm | Browser automation with Chromium |
| `vercel` | 50.25.4 | Vercel deployments |
| `supabase` | 2.75.0 | Supabase management |
| `gh` | Installed | GitHub CLI |

---

## Hosting Platform Analysis

### Option 1: GitHub + Vercel + Supabase (RECOMMENDED)
**Everything has a CLI and free tier. Maximum Claude Code automation.**

| Pros | Cons |
|------|------|
| `vercel` CLI: deploy, promote, env vars, logs — all scriptable | Vercel cron is limited to 1/min on Pro ($20/mo), 1/day on free |
| `supabase` CLI: migrations, edge functions, DB access | Edge Functions have 50ms CPU limit (fine for our use) |
| Vercel **preview deploys per branch** out of the box | Cold starts on serverless (~200ms) |
| Supabase has built-in auth, realtime, cron (pg_cron), free tier | Supabase free tier: 500MB DB, 2 edge function invocations/sec |
| `gh` CLI for repo creation, PRs, branch management | |
| Next.js API routes = no separate backend needed | |

**Cost at scale:**
- Supabase Pro: $25/mo (8GB DB, unlimited auth, 500K edge invocations)
- Vercel Pro: $20/mo (unlimited deploys, 1/min cron, preview branches)
- Upstash Redis: $0 free tier (10K commands/day) → $10/mo (unlimited)
- Notifications: $0 (iMessage via Mac mini)
- **Total MVP: ~$45/mo**

### Option 2: GitHub + Railway
| Pros | Cons |
|------|------|
| Railway CLI: deploy, logs, env vars, services | $5/mo minimum + usage ($0.000231/vCPU-min) |
| Native Docker support, persistent workers | No built-in preview deploys per branch (must create manually) |
| Managed Redis + Postgres add-ons | Postgres add-on starts at $5/mo |
| Great for long-running workers (Celery) | More moving parts (separate frontend deploy needed) |

**Cost at scale:**
- Railway: ~$15-30/mo (API + 2 workers + Redis + Postgres)
- Still need Vercel for frontend: $20/mo
- **Total MVP: ~$45-60/mo + SMS**

### Option 3: GitHub + Fly.io
| Pros | Cons |
|------|------|
| `flyctl` CLI is excellent | More DevOps: Dockerfiles, fly.toml, manual scaling |
| Machines API for dynamic workers | No built-in DB (need Supabase anyway or Fly Postgres) |
| Global edge deployment | Fly Postgres is "not managed" — you manage backups |
| Cheapest raw compute ($1.94/mo per shared CPU) | Preview environments require manual setup |

**Cost at scale:**
- Fly: ~$10-20/mo (machines + volume storage)
- Still need frontend hosting + DB
- **Total MVP: ~$35-55/mo + SMS**

---

### RECOMMENDATION: GitHub + Vercel + Supabase + Upstash Redis

**Why this wins for our use case:**

1. **Full CLI automation** — I can do everything from the terminal:
   - `gh repo create` → create repo
   - `git checkout -b feature/x && git push` → auto-creates Vercel preview deploy
   - `vercel --prod` → promote to production
   - `supabase db push` → run migrations
   - `supabase functions deploy` → deploy edge functions
   - Every branch gets a unique preview URL I send you to test

2. **Branch-based preview deploys are free** — Vercel does this automatically. Push a branch → get `https://teealert-git-feature-x.vercel.app` → I send you the link → you test → I merge or iterate.

3. **No Docker/infra overhead** — Vercel handles scaling, SSL, CDN. Supabase handles DB, auth, cron. We focus purely on product logic.

4. **Polling architecture** — Instead of Celery workers, we use:
   - **Supabase pg_cron** → triggers edge function every N seconds
   - **Upstash QStash** → HTTP-based scheduled task runner with CLI, no infrastructure
   - This is simpler and cheaper than managing Celery + Redis workers

5. **Cost: ~$55/mo at MVP scale**, dropping to effectively $0 during development (all free tiers).

## Tech Stack (Revised)

| Layer | Technology | CLI-Controllable? |
|-------|-----------|-------------------|
| **Repo** | GitHub | `gh` CLI |
| **Runtime** | Next.js 15 (App Router) | `vercel` CLI |
| **API** | Next.js API Routes + Server Actions | Same deploy |
| **Database** | Supabase PostgreSQL | `supabase` CLI |
| **Auth** | Supabase Auth (magic link + Google) | `supabase` CLI |
| **Polling Engine** | Upstash QStash (HTTP cron) | `curl` / REST API |
| **Cache** | Upstash Redis | REST API (no client needed) |
| **Notifications** | iMessage (osascript, Mac mini) | Local script |
| **Payments** | Polar.sh | REST API / `polar` SDK |
| **Frontend** | React + Tailwind + shadcn/ui | Bundled with Next.js |
| **Hosting** | Vercel (everything) | `vercel` CLI |
| **Monitoring** | Sentry | `sentry-cli` |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Vercel (Next.js)                   │
│  ┌───────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Frontend  │  │  API Routes  │  │  Cron Routes │  │
│  │  React/TW  │  │  /api/*      │  │  /api/cron/* │  │
│  └───────────┘  └──────┬───────┘  └──────┬───────┘  │
└──────────────────────────┼────────────────┼──────────┘
                           │                │
            ┌──────────────┼────────────────┼──────┐
            │              ▼                ▼      │
            │     ┌─────────────┐  ┌────────────┐  │
            │     │  Supabase   │  │  Upstash   │  │
            │     │  Postgres   │  │  QStash    │──│──▶ Triggers /api/cron/poll
            │     │  + Auth     │  │  + Redis   │  │    every N seconds
            │     └─────────────┘  └────────────┘  │
            └──────────────────────────────────────┘
                           │
              ┌────────────┼────────────────┐
              ▼            ▼                ▼
         ┌────────────┐  ┌──────────┐  ┌────────────┐
         │  iMessage  │  │  Email   │  │  Web Push  │
         │ (osascript)│  │ (future) │  │  (future)  │
         └────────────┘  └──────────┘  └────────────┘
```

**How polling works without workers:**
1. Upstash QStash calls `POST /api/cron/poll` on a schedule (15s–60s)
2. The API route fetches tee times from ForeUp/Chronogolf
3. Diffs against Redis cache (Upstash Redis, <1ms)
4. If new times found → matches against active alerts in Supabase
5. Fires iMessage notification via Mac mini (`osascript`)
6. Total latency: detection → iMessage ~2-4 seconds

## Dev Workflow (Fully Hands-Free)

```
Me (Claude Code)                    You (Review)
─────────────────                   ────────────
git checkout -b feature/alerts
  ↓
Write code, tests
  ↓
git push origin feature/alerts
  ↓
Vercel auto-deploys preview ────▶  I send you:
                                    "Preview: https://teealert-git-feature-alerts.vercel.app"
                                      ↓
                                    You test it
                                      ↓
                                    "Looks good" or "Change X"
  ↓                                   ↓
gh pr create                       (if changes needed, I iterate)
  ↓
gh pr merge ─────────────────────▶ Auto-deploys to prod
```

Every tool I use is CLI/API-controlled:
- `gh` — repo, branches, PRs
- `vercel` — deploys, env vars, domains, logs
- `supabase` — migrations, functions, auth config
- `curl` — Polar.sh products, prices, webhooks via REST API
- `curl` — Upstash, Polar.sh APIs
- `osascript` — iMessage notifications (Mac mini)

---

## Data Model

### `courses`
```sql
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    platform TEXT NOT NULL,              -- 'foreup' | 'chronogolf' | 'golfnow'
    platform_course_id TEXT NOT NULL,    -- ForeUp: "18747", Chronogolf: UUID
    platform_schedule_id TEXT,           -- ForeUp: "356", Chronogolf: null
    platform_booking_class TEXT,         -- ForeUp: "156", Chronogolf: null
    location_city TEXT,
    location_state TEXT,
    timezone TEXT NOT NULL,              -- 'America/Denver', etc.
    booking_window_days INT,            -- e.g., 30 for Black Desert public
    poll_interval_seconds INT DEFAULT 60,
    ua_override TEXT,                    -- e.g., iPhone UA for ForeUp
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### `alerts`
```sql
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    course_id UUID REFERENCES courses(id),
    target_date DATE NOT NULL,
    earliest_time TIME,                 -- e.g., '07:00' (no later than X start)
    latest_time TIME,                   -- e.g., '14:00'
    min_players INT DEFAULT 1,          -- need at least N open spots
    max_price NUMERIC,                  -- e.g., 100.00
    holes INT[],                        -- [9, 18] or [18]
    notify_sms BOOLEAN DEFAULT false,
    notify_email BOOLEAN DEFAULT true,
    notify_push BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    triggered_at TIMESTAMPTZ,           -- when alert fired (null = pending)
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### `tee_time_snapshots`
```sql
CREATE TABLE tee_time_snapshots (
    id BIGSERIAL PRIMARY KEY,
    course_id UUID REFERENCES courses(id),
    date DATE NOT NULL,
    time TIME NOT NULL,
    available_spots INT,
    green_fee NUMERIC,
    cart_fee NUMERIC,
    holes INT,
    raw_json JSONB,                     -- full API response for debugging
    polled_at TIMESTAMPTZ DEFAULT now()
);
-- Partition by date, retain 7 days
-- Index: (course_id, date, time)
```

### `notification_log`
```sql
CREATE TABLE notification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID REFERENCES alerts(id),
    channel TEXT NOT NULL,              -- 'imessage' | 'email' | 'push'
    recipient TEXT NOT NULL,
    payload JSONB,
    status TEXT DEFAULT 'sent',         -- 'sent' | 'delivered' | 'failed'
    sent_at TIMESTAMPTZ DEFAULT now(),
    latency_ms INT                      -- time from detection to send
);
```

---

## Core Polling Engine (Serverless — Next.js API Routes)

```typescript
// app/api/cron/poll/route.ts
// Called by Upstash QStash on a schedule

import { verifySignature } from "@upstash/qstash/nextjs";
import { Redis } from "@upstash/redis";
import { createClient } from "@supabase/supabase-js";

const redis = new Redis({ url: process.env.UPSTASH_REDIS_URL, token: process.env.UPSTASH_REDIS_TOKEN });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export const POST = verifySignature(async (req: Request) => {
  // 1. Get all courses with active alerts for today's polling window
  const { data: jobs } = await supabase.rpc("get_active_poll_jobs");

  // 2. Poll each course in parallel
  const results = await Promise.allSettled(
    jobs.map(job => pollCourse(job))
  );

  return Response.json({ polled: jobs.length, results });
});
```

### Platform-Specific Pollers

```typescript
// lib/pollers/foreup.ts
const FOREUP_BASE = "https://foreupsoftware.com/index.php/api/booking/times";
const IPHONE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) ...";

export async function pollForeUp(course: Course, targetDate: string) {
  const params = new URLSearchParams({
    time: "all",
    date: formatDate(targetDate, "MM-DD-YYYY"),
    holes: "all",
    players: "0",
    booking_class: course.platformBookingClass,
    schedule_id: course.platformScheduleId,
    "schedule_ids[]": course.platformScheduleId,
    specials_only: "0",
    api_key: "no_limits",
  });

  const resp = await fetch(`${FOREUP_BASE}?${params}`, {
    headers: { "User-Agent": course.uaOverride || IPHONE_UA },
  });
  return resp.json(); // Array of tee times
}
```

```typescript
// lib/pollers/chronogolf.ts
const CHRONOGOLF_BASE = "https://www.chronogolf.com/marketplace/v2/teetimes";

export async function pollChronogolf(course: Course, targetDate: string) {
  const params = new URLSearchParams({
    start_date: targetDate, // YYYY-MM-DD
    course_ids: course.platformCourseId,
    holes: "9,18",
    page: "1",
  });

  const resp = await fetch(`${CHRONOGOLF_BASE}?${params}`);
  const data = await resp.json();
  return data.teetimes || [];
}
```

### Diff Logic (Redis — Critical Path for Speed)

```typescript
// lib/diff.ts
export async function diffAndDetectNew(
  courseId: string, targetDate: string, currentTimes: TeeTime[]
): Promise<TeeTime[]> {
  const cacheKey = `teetimes:${courseId}:${targetDate}`;

  // Get previous snapshot from Redis (<1ms)
  const previous: string[] = await redis.smembers(cacheKey) || [];
  const previousSet = new Set(previous);

  // Build current time keys: "08:30|18|4" (time|holes|spots)
  const currentKeys = currentTimes.map(t => `${t.time}|${t.holes}|${t.spots}`);
  const newTimes = currentTimes.filter(
    (t, i) => !previousSet.has(currentKeys[i])
  );

  // Update cache atomically (TTL = 2 * poll interval)
  if (currentKeys.length > 0) {
    const pipeline = redis.pipeline();
    pipeline.del(cacheKey);
    pipeline.sadd(cacheKey, ...currentKeys);
    pipeline.expire(cacheKey, 120);
    await pipeline.exec();
  }

  return newTimes;
}
```

### Alert Matching + Notification

```typescript
// lib/matcher.ts
export async function matchAndNotify(courseId: string, targetDate: string, newTimes: TeeTime[]) {
  const { data: alerts } = await supabase
    .from("alerts")
    .select("*, users!inner(phone, email)")
    .eq("course_id", courseId)
    .eq("target_date", targetDate)
    .eq("is_active", true)
    .is("triggered_at", null);

  for (const alert of alerts) {
    const matching = newTimes.filter(t => matchesAlert(t, alert));
    if (matching.length === 0) continue;

    // Fire notifications in parallel (don't await — fire and forget)
    const promises = [];
    if (alert.notify_sms && alert.users.phone)
      promises.push(sendIMessage(alert, matching));
    if (alert.notify_email)
      promises.push(sendEmail(alert, matching));

    await Promise.allSettled(promises);
    await supabase.from("alerts").update({ triggered_at: new Date() }).eq("id", alert.id);
  }
}
```

---

## Scheduling Strategy (Upstash QStash)

Simple: **poll everything every 15 seconds.**

QStash's minimum cron is 1/min, so we schedule 4 staggered calls per minute:

```bash
# Schedule 4 calls per minute, staggered at 0s, 15s, 30s, 45s
for DELAY in 0 15 30 45; do
  curl -X POST "https://qstash.upstash.io/v2/schedules" \
    -H "Authorization: Bearer $QSTASH_TOKEN" \
    -d "{
      \"destination\": \"https://teealert.vercel.app/api/cron/poll\",
      \"cron\": \"* * * * *\",
      \"delay\": \"${DELAY}s\"
    }"
done
```

Each call to `/api/cron/poll`:
1. Queries Supabase for all courses with active alerts
2. Polls each course in parallel (`Promise.allSettled`)
3. Diffs against Redis → matches alerts → fires notifications
4. Returns within Vercel's 10s function timeout (easily — each poll is ~200ms)

---

## Notification Templates

### iMessage (via osascript on Mac mini) — Instant and scannable
```
TEE TIME ALERT
Black Desert Resort
Sat Mar 29 @ 8:36 AM
4 spots | 18 holes | $421
Book now: https://foreupsoftware.com/...
```

Sent via `osascript` AppleScript on the always-on Mac mini. No third-party SMS service needed for MVP.

### Email (future)
- Course photo header
- Time, date, spots, price
- One-click "Book Now" button (deep link to booking platform)
- "Snooze" / "Cancel Alert" links

---

## API Endpoints

```
POST   /api/auth/magic-link        — Send login link
GET    /api/courses                 — List supported courses
GET    /api/courses/:id/availability?date=  — Live tee times
POST   /api/alerts                  — Create alert
GET    /api/alerts                  — List my alerts
PATCH  /api/alerts/:id             — Update alert
DELETE /api/alerts/:id             — Cancel alert
GET    /api/alerts/:id/history     — Notification log
POST   /api/webhooks/polar         — Polar.sh subscription events
```

---

## Monetization Tiers

| Tier | Price | Limits |
|------|-------|--------|
| **Free** | $0 | 1 alert, email only, 60s polling |
| **Pro** | $9.99/mo | 10 alerts, SMS + email + push, 30s polling |
| **Birdie** | $19.99/mo | Unlimited alerts, 15s polling, booking window countdown, priority notifications |

---

## Project Structure

```
teealert/
├── app/                            # Next.js App Router
│   ├── page.tsx                    # Landing page / marketing
│   ├── layout.tsx                  # Root layout with auth provider
│   ├── (auth)/
│   │   ├── login/page.tsx          # Magic link login
│   │   └── callback/route.ts       # Supabase auth callback
│   ├── dashboard/
│   │   ├── page.tsx                # My alerts overview
│   │   ├── alerts/
│   │   │   ├── new/page.tsx        # Create alert flow
│   │   │   └── [id]/page.tsx       # Alert detail + history
│   │   └── billing/page.tsx        # Polar.sh customer portal
│   ├── courses/
│   │   ├── page.tsx                # Browse courses
│   │   └── [slug]/page.tsx         # Course detail + live times
│   └── api/
│       ├── cron/
│       │   └── poll/route.ts       # QStash-triggered polling
│       ├── alerts/route.ts         # CRUD alerts
│       ├── courses/route.ts        # List/search courses
│       ├── courses/[id]/
│       │   └── availability/route.ts  # Live tee times
│       └── webhooks/
│           └── polar/route.ts      # Polar.sh subscription events
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Browser client
│   │   ├── server.ts               # Server client (service role)
│   │   └── types.ts                # Generated DB types
│   ├── pollers/
│   │   ├── foreup.ts               # ForeUp API adapter
│   │   ├── chronogolf.ts           # Chronogolf API adapter
│   │   └── types.ts                # Normalized TeeTime type
│   ├── diff.ts                     # Redis-based snapshot diffing
│   ├── matcher.ts                  # Alert → tee time matching
│   ├── notifications/
│   │   ├── imessage.ts             # osascript iMessage (Mac mini)
│   │   └── email.ts                # Future: Resend or similar
│   └── polar.ts                    # Polar.sh helpers
├── components/
│   ├── ui/                         # shadcn/ui components
│   ├── alert-form.tsx
│   ├── course-card.tsx
│   ├── tee-time-grid.tsx
│   └── pricing-table.tsx
├── supabase/
│   ├── migrations/                 # SQL migrations (versioned)
│   │   ├── 001_courses.sql
│   │   ├── 002_alerts.sql
│   │   ├── 003_snapshots.sql
│   │   └── 004_notification_log.sql
│   ├── seed.sql                    # Initial course data
│   └── config.toml                 # Supabase project config
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── .env.local.example
```

---

## Speed Optimizations (Critical for Competitive Advantage)

1. **Redis-first diffing** — Never hit Postgres in the hot path. Compare current vs cached snapshot in Upstash Redis (<1ms via REST API). Postgres writes are fire-and-forget.

2. **Pre-warm polling** — Start aggressive polling 5 minutes before a course's booking window opens (midnight in course timezone). The first user to detect availability wins.

3. **Edge runtime** — Deploy poll routes on Vercel Edge Runtime (not Node.js). Runs in Cloudflare-like V8 isolates — 0ms cold start, executes at the edge closest to the golf booking API.

4. **Notification pipeline** — iMessage via `osascript` is near-instant on local Mac mini. Use `Promise.allSettled()` to send all notifications in parallel without awaiting each.

5. **Vercel region: `iad1` (US East)** — Good middle ground for ForeUp (varies) and Chronogolf (hosted on AWS). Can pin specific routes to `us-west` if Utah-focused.

6. **Fingerprint rotation** — For ForeUp's WAF, rotate through a pool of 20+ mobile User-Agent strings to avoid rate limiting. Store pool in Redis, round-robin per request.

---

## MVP Build Order

### Pre-Requisites — Accounts & API Keys (You Set Up)

Create these accounts and provide the keys as env vars before we start:

| Service | Sign Up | Keys Needed | Free Tier |
|---------|---------|-------------|-----------|
| **Supabase** | [supabase.com](https://supabase.com) | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (Settings → API) | 500MB DB, 50K auth users |
| **Vercel** | [vercel.com](https://vercel.com) | `VERCEL_TOKEN` (Settings → Tokens), link GitHub account | Unlimited deploys, preview branches |
| **Upstash Redis** | [upstash.com](https://upstash.com) | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (create a Redis database) | 10K commands/day |
| **Upstash QStash** | Same Upstash account | `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY` (QStash tab) | 500 messages/day |
| **Polar.sh** | [polar.sh](https://polar.sh) | `POLAR_ACCESS_TOKEN` (Settings → Developers → Access Tokens) | Free, 5% transaction fee |

**Total: 5 accounts, ~12 env vars.** All have generous free tiers — $0 during development.

> **Note:** Twilio and Resend are **skipped**. Notifications will use iMessage via `osascript` on the always-on Mac mini. Email/SMS providers can be added later if needed for multi-user scale.

### Phase 1 — Scaffold & Infra
- `gh repo create britter21/teealert --public --clone`
- `npx create-next-app@latest` with TypeScript, Tailwind, App Router
- `supabase init` + `supabase link` + push migrations
- `vercel link` + set env vars from list above
- Push to main → verify Vercel deploys + Supabase connected

### Phase 2 — Polling Engine (branch: `feature/polling`)
- Implement ForeUp + Chronogolf pollers in `lib/pollers/`
- Redis diff logic in `lib/diff.ts`
- `/api/cron/poll` route with QStash signature verification
- Seed 2-3 real courses (Black Desert, Generals Retreat)
- **→ Preview URL for you to verify polling works**

### Phase 3 — Alerts & Notifications (branch: `feature/alerts`)
- Supabase auth (magic link)
- Alert CRUD API + matching engine
- iMessage notification via `osascript` on Mac mini
- **→ Preview URL: create an alert, trigger it manually, receive iMessage**

### Phase 4 — Frontend (branch: `feature/ui`)
- Landing page, course browser, alert creation flow, dashboard
- shadcn/ui components
- **→ Preview URL for full UX review**

### Phase 5 — Payments & Polish (branch: `feature/billing`)
- Polar.sh subscriptions, tier enforcement
- Rate limit guards, error handling, Sentry
- **→ Preview URL for final review before prod launch**

---

## Verification

At each phase, I will:
1. Push a branch → Vercel auto-deploys a preview URL
2. Send you the preview URL to test
3. Also verify programmatically:
   - **Poller test**: `curl /api/cron/poll` → verify JSON response with real course data
   - **Diff test**: Call poll twice, verify second call returns empty (no new times)
   - **Alert match test**: Create alert via API, manually trigger poll, verify iMessage arrives
   - **E2E latency test**: Measure detection-to-iMessage time, target <5 seconds
   - **Edge case**: Verify ForeUp UA rotation works (no 403s over 100 requests)

---

## iOS App Readiness

The architecture is designed to make a future iOS app straightforward:

1. **API-first** — All logic lives in `/api/*` routes, not in React components. A native app just calls the same endpoints.

2. **Supabase Auth** — Has official Swift SDK (`supabase-swift`). Magic link + Google OAuth work natively on iOS. Same auth tokens, same RLS policies.

3. **Push notifications** — When we add iOS, swap iMessage for Apple Push Notification Service (APNs). The `notification_log` table already tracks channel type (`'imessage' | 'email' | 'push'`). Add `'apns'` and store device tokens in a `user_devices` table.

4. **Polar.sh** — Supports both web and in-app subscriptions. For App Store purchases, Polar can handle receipt validation.

5. **Recommended iOS path when ready:**
   - **SwiftUI + Supabase Swift SDK** for native feel
   - OR **React Native / Expo** to share component logic with the web app (faster to ship)
   - Either way, the backend doesn't change — just add a device token registration endpoint

---

## Why Supabase over Convex

We evaluated Convex — it has great real-time reactivity and TypeScript DX. But Supabase wins for this project:

1. **Better branching** — Full Postgres + Auth instance per Git branch, auto-injected into Vercel previews. Convex previews start empty with no data copy.
2. **We need SQL** — Complex polling queries ("courses with active alerts where booking window opens today grouped by platform") are natural SQL, awkward in Convex's document model.
3. **Built-in auth** — Convex requires Clerk/Auth0 ($25/mo extra).
4. **ForeUp polling needs custom headers** — Convex cron functions can't easily set iPhone User-Agent headers on outbound HTTP. Our QStash → Next.js API route → fetch pattern handles this cleanly.
5. **Open source** — Supabase is fully open source; Convex is not.

If we later need a live real-time tee time board, we can add Supabase Realtime subscriptions or evaluate Convex as a supplementary layer.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| API rate limiting | Respectful polling intervals, exponential backoff, fingerprint rotation |
| API changes/breakage | Schema validation on responses, alert on parse failures, automated health checks |
| ForeUp WAF escalation | UA pool rotation, residential proxy fallback (last resort) |
| Notification delivery lag | Track latency_ms per notification, alert if p95 > 5s |
| Course onboarding is manual | Build admin tool to auto-discover ForeUp course_id/schedule_id from URL |
