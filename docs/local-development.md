# Local development

## Setup

```bash
corepack enable          # pnpm 10 from the root package.json
pnpm install             # every workspace; the lockfile is shared
```

Node 22 is required (`engines`). The mobile app's `postinstall` runs
patch-package.

Each app reads its own environment file; copy the example and ask a
maintainer for the values. Never commit them. The names the code reads:

| App           | File                        | Variables                                                                 |
| ------------- | --------------------------- | ------------------------------------------------------------------------- |
| `apps/api`    | `apps/api/.env`             | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `CLERK_AUTHORIZED_PARTIES`, `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`, `R2_LEGACY_PUBLIC_URLS`, `REDIS_URL` (or `REDIS_HOST`/`REDIS_PORT`), `OPENAI_API_KEY`, `OPENAI_EVENT_PROCESSING_MODEL`, `APIFY_API_TOKEN`, `APIFY_API_POSTS_LIMIT`, `APIFY_API_ONLY_POSTS_NEWER_THAN_IN_DAYS`, `VENUE_PICTURES_APIFY_BUDGET_USD`, `VENUE_PICTURES_PROFILES_PER_RUN`, `VENUE_PICTURES_GOOGLE_MAPS_SEARCHES_PER_RUN`, `CHECKIN_RADIUS_METERS`, `DEFAULT_VENUE_HOST_ID`, `SCRAPE_VENUE_CONTACTS`, `HOST_URL`, `MOBILE_URL`, `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `PORT` |
| `apps/mobile` | `apps/mobile/.env` (from `.example.env`) | `EXPO_PUBLIC_API_URL` (default `http://localhost:3001`), `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `EXPO_PUBLIC_MAPTILER_KEY`, `EXPO_PUBLIC_ENVIRONMENT`, `EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_SENTRY_ENVIRONMENT`, `EXPO_PUBLIC_SENTRY_RELEASE` |
| `apps/host`   | `apps/host/.env.local` (from `.env.example`) | `TULUM_API_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_AUTHORIZED_PARTIES`, `NEXT_PUBLIC_MAPTILER_KEY`, `NEXT_PUBLIC_TULUM_MOBILE_URL`, `NEXT_PUBLIC_TULUM_APP_STORE_URL`, `NEXT_PUBLIC_TULUM_PLAY_STORE_URL`, `MASKENBAL_EVENT_ID` |

Local `.env` files use Clerk's development instance: production keys only work
on `tulum-app.com` (see [deployment.md](deployment.md#clerk)). Every
environment shares one Supabase project, so a local API works on real data.
Treat it that way: the API's scheduled scrapers and venue picture job write
as soon as it runs.

## Running the apps

```bash
pnpm --filter tulum-api start:dev     # API on :3001
pnpm --filter tulum-app web           # Expo web on :8081 (or `start` for a device)
pnpm --filter tulum-host dev          # site and dashboard on :3000
```

`pnpm dev` at the root starts all three through Turbo.

AI agents must not start the API (its jobs write). They test against a stand-in
on port 3001 or the read-only proxy instead; see [testing.md](testing.md) and
[AGENTS.md](../AGENTS.md).

## Android emulator

`bash scripts/start-tulum-android-emulator.sh` boots the `Medium_Phone_API_36`
AVD with Vulkan off and reverses ports 8081 and 3001. Build the debug app once
with `pnpm --dir apps/mobile exec expo run:android --no-bundler` (10–13
minutes; rebuild only after native changes), then start Metro. Details and deep
links are in [AGENTS.md](../AGENTS.md#android-emulator-testing).

## Database

The schema is in `apps/api/supabase/schema.sql`, with changes as timestamped
files in `apps/api/supabase/migrations/` and one-off data repairs in
`apps/api/supabase/data-fixes/`. Migrations are applied by hand in the
Supabase SQL editor by a maintainer; nothing applies them automatically. A new
table needs explicit `GRANT`s to `service_role` (Supabase's default grants
changed on 30 October 2026).

## Dead-code check

```bash
pnpm dlx knip@6.45.1
```

It should report nothing; see [refactoring.md](refactoring.md) for how to read
a finding before deleting anything.
