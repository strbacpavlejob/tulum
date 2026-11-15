# Load test (Maskenbal B6)

Checks that the API, the database and the sockets hold a 2,000-guest night
before the Maskenbal: the Matches deck, swipes, the inbox, chat and the
guest list, with real Clerk session tokens (no auth bypass). It runs against
a **staging** copy of the stack only; the scripts refuse production.

| Target | How it is read |
| --- | --- |
| 100, 500, 1,000 and 2,000 guests, 30 minutes each | `EQUIV` and `HOLD_MINUTES` (below) |
| 1,000 open sockets | `SOCKETS_PER_VU` (one per guest, up to 10 a VU) |
| p95 under 800 ms for the deck, swipe, attend and the matches list | k6 thresholds `http_req_duration{name:…}` |
| Errors under 0.5% | k6 threshold `http_req_failed{scope:app}` |
| Database CPU under 70% | Supabase dashboard of the staging project |
| Chat delivery p95 under 2 s | k6 threshold `chat_delivery` |
| Real token checks | Tokens come from Clerk's Backend API; the API verifies them as the app's |

## What's here

- `k6/tulum.js`: the night. Each virtual user (VU) is one real user of the
  staging Clerk app, acting for `EQUIV / VUs` guests at the rates in
  `PER_GUEST_PER_MINUTE` (a card every 10 s on Matches, the deck's counts
  every 30 s, the inbox, event details, the guest list, a chat message every
  few minutes), with its share of open sockets. Its setup signs every user
  in, onboards them, joins and checks in to the event, and makes pairs that
  match and chat, so chat delivery is timed from send to the partner's
  socket.
- `k6/lib/`: session tokens from Clerk's Backend API, and a socket.io client
  for k6 (the app's sockets are websocket-only).
- `token-users.mjs`: makes the load users in the staging Clerk app and a
  session for each (`.token-users.json`, kept out of git).
- `sql/seed-staging.sql`: the event "Load test night" with 2,000 seeded
  guests checked in. `sql/seed-likes-staging.sql`: some of them like the load
  users, so swipes make matches. `sql/teardown-staging.sql`: removes it all.
- `tools/selftest.mjs`: checks the socket.io client against a real socket.io
  server, without k6.

## Staging (set up by you)

1. **Supabase**: a project of its own for staging, on the plan and compute
   size production will have on the night (the CPU figure only transfers
   from the same size). Give it production's schema (a schema-only
   `supabase db dump` of production), then the migrations production is
   still waiting for, so it runs what the night will:
   `20261111210742_paged_swipe_deck_and_guest_list.sql` above all (without
   it the API reads the whole deck on every page, a different test),
   `20261114152119_index_foreign_keys.sql`,
   `20261114204309_consent_attribution_archive.sql` and
   `20261114204310_moderation_views.sql`.
2. **Clerk**: a separate application for staging; its development instance
   (`sk_test_…`) is enough. No webhooks, so its users never reach the main
   database. A development instance takes 100 users. The main app runs on a
   development instance too, so its key also starts with `sk_test_`:
   `token-users.mjs create` refuses an instance with more than 5 users
   besides the load users.
3. **Railway**: a staging service of the API, same plan and region as
   production, with the staging `SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY`, the staging app's `CLERK_SECRET_KEY` and
   `CLERK_PUBLISHABLE_KEY`, and a Railway Redis as `REDIS_URL` (the feed
   cache and the socket adapter use it). Copy production's other variables,
   but give `OPENAI_API_KEY` and `APIFY_API_TOKEN` a placeholder such as
   `staging-off`: the API needs them to start, and the scraper's run on
   Mondays and Thursdays at 10:30 then fails at the provider instead of
   spending. Set `SENTRY_ENVIRONMENT=staging` if `SENTRY_DSN` is set. The
   API checks `azp` only on tokens that carry one, and Backend API tokens
   shouldn't; if the smoke run's `setup:` checks fail with 401, leave
   `CLERK_AUTHORIZED_PARTIES` unset on staging.
4. **The machine that runs k6**: [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/)
   2.3.0 or later (it fixed a hang on sockets closed mid-handshake), Node 22,
   and a steady connection (not a phone hotspot). 100 VUs and 1,000 sockets
   fit on a laptop.

## Running it

```bash
export API=https://<staging api>.up.railway.app
export CLERK_SECRET_KEY=sk_test_...   # the staging Clerk app's key
```

1. Seed the event: run `sql/seed-staging.sql` in the staging project's SQL
   editor. It refuses a database that has events of its own, as production
   does. The check at its end should read 2000, 2000, 2000. Run it again
   before a session more than 12 hours later; it moves the event to now.
2. Make the load users (90 by default; 100 if the staging app has no other
   users) and check the socket client:

   ```bash
   node loadtest/token-users.mjs create 100
   node loadtest/tools/selftest.mjs
   ```

   Sessions last as long as the Clerk instance's session lifetime (7 days
   by default); `node loadtest/token-users.mjs sessions` makes new ones.
3. Smoke run, which also prepares the users (onboarding, ticket, check-in,
   pairs):

   ```bash
   k6 run -e EQUIV=100 -e HOLD_MINUTES=5 loadtest/k6/tulum.js
   ```

   Every `setup:` check should pass.
4. Run `sql/seed-likes-staging.sql`, so about one like in ten makes a match.
5. The four stages, 30 minutes each, one at a time: `EQUIV` 100, then 500,
   1,000 and 2,000, with a few minutes between them for the database to
   settle.

   ```bash
   mkdir -p loadtest/results
   export EQUIV=100
   K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_EXPORT=loadtest/results/stage-$EQUIV.html k6 run -e EQUIV=$EQUIV loadtest/k6/tulum.js
   ```

   k6 exits with code 99 when a threshold fails. Stop at the first stage
   that fails and find out why before going on.
6. Two API instances (N-17): set the staging API's replicas to 2 on Railway.
   Each replica's deploy log should say "Sockets are shared across instances
   through Redis". Run the 1,000 stage again. Sockets now land on either
   replica, so pushes and chat messages cross instances through Redis; the
   run passes when `chat_delivery` holds under 2 s and `inbox_pushes` keeps
   counting. The app's sockets are websocket-only, so no sticky sessions are
   needed. If one instance tops out before 2,000, this is how the night
   scales.
7. Tear down: run `sql/teardown-staging.sql`, then
   `node loadtest/token-users.mjs delete --yes`. Both remove only the load
   test's own rows and users.

## Reading the results

- **k6**: the summary at the end marks each threshold passed or failed.
  `K6_WEB_DASHBOARD=true` shows the run live at http://127.0.0.1:5665 and
  `K6_WEB_DASHBOARD_EXPORT` saves it as an HTML report. Besides the
  thresholds: `inbox_pushes` (socket pushes received), `like_limit_reached`
  (likes the limit refused, expected late in long runs) and the
  `http_req_duration` of each request `name`.
- **Supabase** (staging project): database CPU and memory, connections, and
  the slowest statements in Query Performance, over the run's window.
- **Railway**: CPU, memory and network of each API replica and of Redis.
- **Sentry**: errors from the staging environment in the run's window.

Write down, per stage: the thresholds, the database's peak CPU, the API's
peak CPU and memory, and anything Sentry caught. A failed target is fixed in
the code before the next stage, not waved through.

## Settings

| Variable | Default | |
| --- | --- | --- |
| `API` | (required) | The staging API's URL. Production hosts are refused. |
| `CLERK_SECRET_KEY` | (required) | The staging Clerk app's `sk_test_` key. |
| `EQUIV` | 100 | Guests the run stands for. |
| `HOLD_MINUTES` | 30 | How long every guest stays. |
| `RAMP_MINUTES` | 2 | Arrivals are spread over this. |
| `SOCKETS_PER_VU` | guests per VU, up to 10 | Open sockets per VU. |
| `LIKE_SHARE` | 0.1 | Share of swipes that are likes. |
| `EVENT_ID` | the seeded event | |
| `VUS` | all load users | Fewer VUs, each standing for more guests. |
| `USERS_FILE` | `loadtest/.token-users.json` | Relative to `k6/`. |
| `CLERK_API_URL` | Clerk's Backend API | For a dry run against stand-ins. |
