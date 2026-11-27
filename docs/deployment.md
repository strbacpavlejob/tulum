# Deployment

Pushing to `main` deploys. There is no staging deploy of the apps yet, so
review and check before merging.

| Part            | Host     | Project / service | Builds from      | Address                                   |
| --------------- | -------- | ----------------- | ---------------- | ----------------------------------------- |
| Site and dashboard | Vercel | `tulum`           | `apps/host`      | https://tulum-app.com                     |
| Guest web app   | Vercel   | `tulum-mobile`    | `apps/mobile` (`expo export --platform web`) | https://mobile.tulum-app.com |
| API             | Railway  | `tulum-api` (production) | `apps/api` | https://api.tulum-app.com (custom domain since 24 November 2026; https://tulum-api-production.up.railway.app still answers) |
| Database, edge functions | Supabase | one project for every environment | `apps/api/supabase`, `apps/host/supabase/functions` | |
| Auth            | Clerk    | production instance (`clerk.tulum-app.com`) for the deployed apps once their keys are switched; development instance for local work | | |
| Pictures        | Cloudflare R2 | bucket `tulum-images` | uploads from the API | https://img.tulum-app.com (`R2_PUBLIC_URL`) |
| Scraping actors | Apify    | free plan, one account | runs started by the API | https://console.apify.com |
| Instagram posts | Meta     | an app with the Instagram API, Tulum's account | posts from the API | https://developers.facebook.com/apps |

## Vercel (site and web app)

- Each push to `main` builds both projects; a project the push doesn't touch
  reports "Skipped - Not affected".
- Installs use the workspace `pnpm-lock.yaml` (frozen), so a dependency change
  must update the lockfile in the same commit.
- The site's `next build` type-checks every `.ts` file in `apps/host`, which is
  why `apps/host/tsconfig.json` excludes the Deno edge functions.
- One `@types/react` version for the whole workspace (root `pnpm.overrides`):
  two copies broke the site's build before (BUG-053).

## Railway (API)

- Builds `apps/api` on its own, with root directory `apps/api` and the watch
  path `/apps/api/**` (watch paths match from the repository root). A push that
  changes nothing under `apps/api` is skipped.
- The start command (`node dist/main`) is set in the service settings. Config
  as Code files are not used (Railway stops reading them on 1 December 2026).
- **The workspace lockfile isn't used**: pnpm comes from `apps/api/package.json`
  (`packageManager`) and every dependency resolves to the newest version in
  its range. A local `nest build` can pass while Railway's fails (BUG-054), so
  check type changes against the newest in-range typings.

## Supabase

- **Migrations** in `apps/api/supabase/migrations/` and data fixes in
  `data-fixes/` are applied by hand, in order, by a maintainer, in the SQL
  editor. AI agents never apply them (Supabase is read-only for agents).
  Apply a migration before deploying code that needs it, or make the code
  tolerate its absence (several do: they answer 503 or fall back).
- **Edge functions** `create-user` and `delete-user` (Clerk webhooks) live in
  `apps/host/supabase/functions` and are deployed by a maintainer with the
  Supabase CLI (`pnpm exec supabase functions deploy <name>`, the CLI is a root
  dev dependency), after setting their secrets: each endpoint has its own
  Clerk signing secret, and `CLERK_FRONTEND_API` is the host name without
  `https://`. Both Clerk instances send to the same two functions, so
  `CLERK_CREATE_USER_SIGNING_SECRET` and `CLERK_DELETE_USER_SIGNING_SECRET`
  each hold the development and the production endpoint's secret, separated
  by a space; a request signed with either passes.

## Clerk

The Clerk app `tulum-demo` has two instances:

| Instance    | Used by                                         | Frontend API                          |
| ----------- | ----------------------------------------------- | ------------------------------------- |
| Development | local work and debug builds; caps at 100 users  | `useful-serval-81.clerk.accounts.dev` |
| Production  | the deployed site, web app and API              | `clerk.tulum-app.com`                 |

Production keys only work on `tulum-app.com` and its subdomains, so local
`.env` files keep the development keys.

**Keep the two instances alike.** Their settings were identical when
production was set up (27 November 2026): sign-up with an email address and
a password, the address confirmed with an email code; username, first and
last name required; Google; Device Trust, so a password sign-in on a new
device asks for an email code. Change a setting in both dashboards. The one
deliberate difference is Apple: on in development (Clerk's shared
credentials), off in production until it has Apple credentials, so Clerk's
sign-in form on the site shows no Apple button there. The guest app hides
its Apple button in both (`apps/mobile/src/lib/sign-in-options.ts`); turn
both back on together. Production also has:

- **DNS:** five CNAME records in Cloudflare, all DNS only: `clerk`,
  `accounts`, `clkmail`, `clk._domainkey` and `clk2._domainkey` (targets in
  Clerk → Domains). Clerk issues the certificates once they verify.
- **Google:** its own OAuth client, "Clerk production (tulum-app.com)", in
  the Google Cloud project Tulum (`tulum-483210`), with the consent screen
  published (External, In production; basic scopes need no Google review).
  Redirect URI `https://clerk.tulum-app.com/v1/oauth_callback`, origins
  `https://tulum-app.com` and `https://mobile.tulum-app.com`. Its client ID
  and secret go in Clerk → SSO connections → Google (Use custom credentials).
  The development instance uses Clerk's shared Google credentials.
- **Webhooks:** `create-user` (`user.created`) and `delete-user`
  (`user.deleted`), pointing at the same Supabase functions as development's.
- **Native apps:** `tulumapp:///(auth)/sso-callback` in the redirect
  allowlist (production refuses SSO redirects to unlisted app URLs).
- **Supabase integration** turned on, as in development.

Not copied: users (production started empty, so everyone signs up again and
gets a new user ID) and development's `supabase` JWT template, which no code
uses and which would need the Supabase JWT secret.

**Switching the deployed apps to production.** In each service, replace the
development keys with production's (Clerk → API keys, production instance),
then redeploy:

- Railway `tulum-api`: `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`.
- Vercel `tulum` (site and dashboard): `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and
  `CLERK_SECRET_KEY`.
- Vercel `tulum-mobile` (web app): `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, read
  at build time.

Until all three run with the new keys, the API refuses the other instance's
sessions. Signed-in people are signed out and sign up again; an admin flags
their new account in Supabase (`users.is_admin`).

## Apify

The API runs three public Apify actors with one account's token
(`APIFY_API_TOKEN`): `apify/instagram-scraper` for the weekly Instagram posts
scrape, and `apify/instagram-profile-scraper` and
`compass/crawler-google-places` for venue pictures. All three charge per
event, and the free plan can run them: no actor needs renting or turning
on. The free plan includes $5 of usage a month, needs no card, and blocks
the account until the next cycle once it is used up, so the venue picture
job keeps to a budget ([scrapers.md](scrapers.md#staying-on-apifys-free-plan)).

Setting it up, or checking it:

1. **Account.** Sign in at https://console.apify.com. The token in Railway
   belongs to one account; that account's plan and usage are what count.
2. **Token.** Settings → API & Integrations
   (https://console.apify.com/settings/integrations) → Personal API tokens.
   Use the default token, or "Create a new token" (it is shown only once).
   A token with "Limit token permissions" turned on must still be able to
   run actors, read their runs' default datasets and read the account's
   usage; check the last with
   `curl -H "Authorization: Bearer <token>" https://api.apify.com/v2/users/me/limits`.
   Without usage, the job looks nothing up.
3. **Railway.** In the `tulum-api` service's Variables set `APIFY_API_TOKEN`,
   with `APIFY_API_POSTS_LIMIT` and `APIFY_API_ONLY_POSTS_NEWER_THAN_IN_DAYS`
   for the posts scrape; the API doesn't start without these three. The
   venue picture job's settings are optional:
   `VENUE_PICTURES_APIFY_BUDGET_USD` (default 3.5),
   `VENUE_PICTURES_PROFILES_PER_RUN` (200) and
   `VENUE_PICTURES_GOOGLE_MAPS_SEARCHES_PER_RUN` (25). Saving variables
   redeploys the service.
4. **Limit.** Billing → Limits (https://console.apify.com/billing#/limits)
   shows the account's monthly usage limit. The job stays under it and under
   its own budget, whichever is lower, so lowering the limit there also
   lowers what the job spends.
5. **Check.** After a deploy, `GET /venue-pictures/missing` (admin) shows
   `apifyBudget`: the usage, the ceiling and when the cycle ends. If it is
   null, the token can't read the usage. Billing → Current period, and each
   run under Runs, show what was spent.

## Instagram

The weekly posts and the Stories need `INSTAGRAM_ACCESS_TOKEN` on the
`tulum-api` service: a token for Tulum's professional Instagram account
(tulum_app) from the Meta app Tulum Posts, plus `INSTAGRAM_USER_ID`, the
account's ID. Without the token both are off. The Stories also need the
publishing history's migration
(`20261126213507_social_media_publications.sql`); until it is applied they
don't go out, and the posts go out without the history. Setting it up, the
optional variables (`INSTAGRAM_POSTS_*`, `INSTAGRAM_STORIES_SCHEDULE`,
`_EVENTS`, `_WINDOW_HOURS`) and the checks before the first post are in
[instagram-posts.md](instagram-posts.md#setup). The app's Unified login
token never expires; a token that stops working is reported in the logs.

## DNS

tulum-app.com's DNS is on Cloudflare since 24 November 2026 (registered at
Namecheap, nameservers `guss` and `jacqueline.ns.cloudflare.com`). The apex,
`www` and `mobile` point at Vercel, `api` at Railway (DNS only, with Railway's
`_railway-verify.api` TXT record), and `img` is the R2 bucket's custom domain
(proxied, managed by R2). Clerk production's five CNAME records (`clerk`,
`accounts`, `clkmail` and two `_domainkey`) are DNS only: proxied, Clerk
can't verify them or issue their certificates.

## Checking that a push went live

No logins are needed:

1. **Statuses.** `https://api.github.com/repos/strbacpavlejob/tulum/commits/<sha>/status`
   lists "Vercel – tulum", "Vercel – tulum-mobile" and "tulum-api - tulum-api".
   A Railway "Success" alone isn't proof: a skipped deploy reports it too.
2. **API.** Swagger JSON at `/api-json` is built from the running code: a new
   route or DTO name there proves the deploy. With the Railway CLI linked,
   `railway deployment list --json` shows each deployment's status and skip
   reason.
3. **Site.** The `age` header on https://tulum-app.com/guest shows how old the
   cached page is; a new route answers 404 until it deploys.
4. **Web app.** The page at https://mobile.tulum-app.com/ lists its
   `/_expo/static/js/web/*.js` bundles; search them for a string from the change.

Expect the site in about 3 minutes, the web app in about 5 and the API in 1–6.

## Rolling back

- Vercel: promote the previous deployment of the project (instant).
- Railway: redeploy the previous deployment from the service's history.
- A migration has no automatic rollback: write the reverse SQL with it.
