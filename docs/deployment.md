# Deployment

Pushing to `main` deploys. There is no staging deploy of the apps yet, so
review and check before merging.

| Part            | Host     | Project / service | Builds from      | Address                                   |
| --------------- | -------- | ----------------- | ---------------- | ----------------------------------------- |
| Site and dashboard | Vercel | `tulum`           | `apps/host`      | https://tulum-app.com                     |
| Guest web app   | Vercel   | `tulum-mobile`    | `apps/mobile` (`expo export --platform web`) | https://mobile.tulum-app.com |
| API             | Railway  | `tulum-api` (production) | `apps/api` | https://tulum-api-production.up.railway.app |
| Database, edge functions | Supabase | one project for every environment | `apps/api/supabase`, `apps/host/supabase/functions` | |
| Auth            | Clerk    | development instance (production instance created, not live) | | |
| Pictures        | Cloudflare R2 | one bucket   | uploads from the API | `R2_PUBLIC_URL`                     |

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
  `https://`.

## Clerk

All environments use the development instance, which caps at 100 users. The
production instance exists; going live needs its DNS records at the domain's
registrar, Google and Apple production credentials, and the mobile SSO
redirect allowlist. Track this in [launch-plan.md](launch-plan.md).

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
