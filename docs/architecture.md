# Architecture

## Monorepo

A pnpm workspace (`pnpm-workspace.yaml`) with Turborepo for `dev`, `build`,
`lint` and `test` across apps. Node 22, pnpm 10.

| Path            | What it is                                                                 |
| --------------- | -------------------------------------------------------------------------- |
| `apps/api`      | NestJS API (`tulum-api`): every read and write of app data, scrapers, chat |
| `apps/mobile`   | Expo app (`tulum-app`) for guests; launched as a web app, native later     |
| `apps/host`     | Next.js site (`tulum-host`): landing pages and the venue host dashboard    |
| `loadtest/`     | k6 load-test kit and staging seed SQL ([README](../loadtest/README.md))    |
| `scripts/`      | Test browser and emulator launchers, read-only API proxy, poster kit       |
| `docs/`         | This documentation                                                         |
| `knip.jsonc`    | Dead-code check for the whole workspace ([refactoring.md](refactoring.md)) |
| `eslint-rules/` | The shared ESLint rule for file and folder names ([conventions.md](conventions.md)) |

## How the parts talk

```
 guests ──► apps/mobile (Expo web / native) ──┐  Clerk session token
                                              ├─► apps/api (NestJS) ──► Supabase Postgres (service role)
 hosts ───► apps/host (Next.js) ──► /api/* ───┘        │   │   └──► Redis (feed cache, socket.io adapter)
            route handlers (Clerk check,               │   └──────► Cloudflare R2 (pictures)
            then forward to the API)                   └──────────► GoOut, Guest List Serbia, Apify/Instagram,
                                                                     EventZeka, OpenAI, Nominatim (scrapers)
 Clerk ──webhooks──► Supabase edge functions (apps/host/supabase/functions: create-user, delete-user)
```

- **Auth.** Clerk everywhere. The apps send `Authorization: Bearer <Clerk
  session token>`; `ClerkAuthGuard` (global) verifies it and `@UserId()` reads
  the verified id. `@Public()` routes accept anonymous callers. Admin routes use
  `AdminGuard`. The chat socket verifies the token in its handshake. See the
  `tulum-clerk-api-auth` skill before touching any of this.
- **Data.** Only the API talks to Supabase, with the service-role key. The host
  dashboard's `app/api/*` route handlers check the Clerk session and forward to
  the API with `callTulumApi` (`apps/host/lib/nestjs-client.ts`, `TULUM_API_URL`).
  The schema and migrations live in `apps/api/supabase/` (`schema.sql`,
  `migrations/`, `data-fixes/`).
- **Users.** Clerk's webhooks create and delete the `users` row through the two
  edge functions; the API also provisions a missing row on first use
  (`UserProvisioningService`).
- **Realtime.** Chat runs on socket.io (`ChatsGateway`) with a Redis adapter so
  several API instances share rooms; the inbox gets pushed updates.
- **Observability.** Sentry in the API and the app; Swagger JSON is public at
  `/api-json` on the API.

## apps/api

NestJS 11, one module per feature under `src/`:

| Module            | Responsibility                                                         |
| ----------------- | ---------------------------------------------------------------------- |
| `events`          | `EventsFeedService` (public feed and details, cached), `EventsCrudService` (host dashboard CRUD), check-in sessions (`EventsController`) |
| `tickets`         | Joining events, guest lists (paged)                                    |
| `guests`          | `GuestsService` (profile, onboarding, photos), `SwipeDeckService` (the Matches deck) |
| `matches`         | Swipe decisions (atomic RPC with the like limit), matches              |
| `chats`           | Chats, messages, the socket gateway, inbox push, Redis adapter         |
| `guest-safety`    | Blocks, reports, visibility rules                                      |
| `reports`         | Admin view of guest reports                                            |
| `retention`       | Consent log (launch email), attribution (first event, QR poster)       |
| `users`           | `/users/me`, provisioning, account deletion                            |
| `venues`, `favorites`, `settings`, `statistics` | What their names say                     |
| `cleanup`         | Archiving expired matches, deleting past events (admin and after scrapes) |
| `scrape`, `instagram`, `duplicate-checker`, `geocoder` | Imports, see [scrapers.md](scrapers.md) |
| `supabase`        | `SupabaseService` (the client), `ScrapedDataService` (scraper reads and writes), `scraped-rows.ts` (pure row mapping) |
| `r2`, `redis`     | Storage and cache clients                                              |
| `seed`            | Development seed data                                                  |
| `common`          | Guards, decorators, shared rules (`like-limit.ts`, `checkin-radius.ts`, `paging.ts`, time helpers) |

Conventions: business rules live in the API (and in Postgres functions for
atomic ones), not in the clients. Controllers stay thin; a service per
responsibility; pure rules in plain modules with their own specs.

## apps/mobile

Expo SDK 58, React Native 0.88, Expo Router, NativeWind 4, Zustand
(`store/use-store.ts`), Clerk (`@clerk/expo`). Shipped first as a static web
export on Vercel (mobile.tulum-app.com); Android and iOS builds follow.

- `app/`: routes only. `(auth)/` sign-in, email code, sign-up, onboarding;
  `(tabs)/` the feed (`index`), tickets, matches, inbox, profile;
  `event-details/[id]`; `e/[id]` (the QR join link).
- `components/<screen>/`: pieces of one screen (`profile/`, `matches/`,
  `inbox/`, `event-details/`, `onboarding/`, `birthday-picker/`,
  `listings-map/`, `profile-info/`). `components/ui/` is the shared UI kit
  (react-native-reusables); keep it, even where a component is unused.
- `components/map/`: native maps are Leaflet pages in WebViews;
  `*.web.tsx` / `*.native.tsx` files are picked by platform.
- `lib/api.ts`: the API client (all fetches). `lib/geo.ts`: distance helper.
  `lib/i18n.ts`: EN, SR and RU strings.
- Never put a non-route file under `app/`: Expo Router would make it a route.

## apps/host

Next.js 16 (App Router), Tailwind 4, shadcn/ui, Clerk (`@clerk/nextjs`),
i18next (`locales/{en,sr,ru}`), MapLibre maps.

- Public pages: `/` and `/guest`, `/host`, `/support`, privacy, terms,
  `/delete-account`, `/child-safety`. Copy lives in `lib/public-pages-copy.ts`
  and the locale files.
- Dashboard (`app/(protected)/`): dashboard, events, venues, map, reports
  (Tulum admins). `proxy.ts` puts these behind Clerk sign-in.
- `components/<feature>/` holds a dashboard feature's pieces:
  `venue-dialog/`, `event-dialog/`, `events-table/`, `event-stats/`,
  `events-map/`, `venues-page/`, `reports-page/`. `components/common/` holds
  shared form pieces (`image-upload`, `location-picker`, `use-image-file`).
  `components/ui/` is the shadcn kit; keep it.
- `lib/api-client.ts`: browser calls to the site's own `/api/*` routes.
