# GymTracker

A mobile-first workout tracker: log exercise → sets → reps → weight in two taps, with FitNotes-level depth (routines, PRs, progress charts, a calendar history) and a built-in growth loop — every workout or PR can become a shareable image in one tap.

Full product/technical background lives in [`GymTracker_System_Design.md`](../GymTracker_System_Design.md) and the phased build plan this codebase followed lives in [`GymTracker_Claude_Build_Sequence.md`](../GymTracker_Claude_Build_Sequence.md).

## Tech stack

- **Next.js 14** (App Router, TypeScript) + **Tailwind CSS**
- **Supabase** — Postgres (with Row Level Security), Auth (magic-link email + Google), auto REST API
- **Recharts** for the per-exercise progress chart
- **html-to-image** + the native **Web Share API** for the Share Card
- **IndexedDB** (via `idb`) for the offline set-logging queue
- **next-pwa** for the installable, offline-capable PWA shell

## Prerequisites

- **Node 18.17+ or 20 LTS.** Next.js 14 will not run on anything older — check with `node -v` before `npm install`.
- A free [Supabase](https://supabase.com) project.
- A GitHub account (for pushing this repo) and a [Vercel](https://vercel.com) account (for hosting) — both free tiers are enough to start.

## 1. Set up Supabase

1. Create a new Supabase project.
2. Open the SQL Editor and run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) — this creates every table, the automatic PR-detection trigger, and all RLS policies. Run it exactly as-is; it's meant to be the one source of truth for the schema.
3. Run [`supabase/seed.sql`](supabase/seed.sql) next — it seeds 8 default categories and 80 default exercises. It's idempotent (guarded by `NOT EXISTS` checks), so re-running it later is safe.
4. In **Authentication → Providers**, enable **Email** (magic link, which is on by default) and **Google**. For Google you'll need an OAuth client ID/secret from the Google Cloud console — Supabase's provider page links directly to those docs.
5. In **Authentication → URL Configuration**, add your local dev URL (`http://localhost:3000`) and, once deployed, your production URL, plus `/auth/callback` on each as a redirect URL.

## 2. Run it locally

```bash
npm install
cp .env.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
# from your Supabase project's Settings → API page
npm run dev
```

Open `http://localhost:3000`, sign in with a magic link, and you should land on the dashboard. `npm run generate-icons` re-generates the placeholder PWA icons in `public/icons/` if you ever delete them (see **Known limitations** below).

## 3. Push to GitHub

```bash
gh repo create <your-username>/gymtracker --private --source=. --remote=origin
git push -u origin main
```

(No `gh` CLI? Create the empty repo on github.com first, then `git remote add origin <url>` and `git push -u origin main`.)

## 4. Deploy to Vercel

1. Import the GitHub repo at [vercel.com/new](https://vercel.com/new).
2. Add the same two environment variables from `.env.local` in the Vercel project's settings.
3. Deploy — Vercel builds and hosts the Next.js app on every push to `main`.
4. Optional: buy a domain and point it at the Vercel project (**Settings → Domains**), then add that URL to Supabase's redirect-URL allowlist too.

From here, share the URL with your friend group — the Share Card starts working for you from day one.

## Project structure

```
app/(auth)/        magic-link + Google login, OAuth callback route
app/(app)/         every authenticated screen (dashboard, workout, history, routines, exercises, profile)
components/        one component per concern — see inline comments for what each owns
hooks/             useWorkoutSession (active-session state) and useOnlineStatus
lib/               supabaseClient, typed queries.ts, calculations.ts, csv.ts, offlineQueue.ts
supabase/          the schema migration and seed data
scripts/           the placeholder-icon generator
```

`lib/queries.ts` holds every typed data-access function; `app/(app)/actions.ts` wraps most of them as Server Actions for use in forms. The one deliberate exception is set-logging itself (`hooks/useWorkoutSession.ts`), which talks to Supabase directly from the browser — see the comment at the top of that file for why.

## Known limitations (honest v1 scope, not oversights)

- **Workout dates use the database's UTC `current_date`.** A workout logged right around midnight local time could land on the "wrong" calendar day for users far from UTC. Every date calculation in the app code itself is careful to stay in local time — this is the one skew that would require a schema change to fully fix.
- **Offline support covers logging sets, not starting a workout from scratch or finishing one.** Start a workout while you still have signal (or are on the app already); sets you log after signal drops queue in IndexedDB and sync automatically the moment you're back online. "Finish" and starting a brand-new session both need connectivity, since they're Server Component/Action round trips.
- **Cardio logging (distance/duration) isn't wired into the active-logging input row yet** — cardio exercises show a placeholder message there. The schema and queries fully support it; only that one UI surface is deferred.
- **The calendar's tap-to-filter is client-side only** (no URL/query-param sync), and it doesn't yet support the swipe-between-days gesture described in the original design's Flow C.
- **PWA icons are placeholders** — a solid dark background with an orange circle, generated by `scripts/generate-icons.js` with zero image-library dependencies. Swap them for real branded artwork (e.g. via `npx pwa-asset-generator`) before a real launch.
- **A workout row is created as soon as `/workout/new` loads**, whether or not you go on to log anything — abandoning the page leaves an empty workout row. Fine for v1; worth revisiting if it turns out to happen a lot.

## Phase 2 ideas (from the original design doc)

Crew/leaderboards, supersets and multiple rest timers, RPE/RIR tracking, body-metrics tracking, and a watch companion app are all deliberately out of scope for this v1 — see §12 of the system design doc.
