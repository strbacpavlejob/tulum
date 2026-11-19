# Launch plan: KST Maskenbal (web)

Tulum launches as a **web app** (https://mobile.tulum-app.com) at the KST
Maskenbal, a masked ball with about 5,000 guests. QR posters at the venue lead
to the event's join page. Android and iOS apps follow in January.

The full plan, with its findings, lives in the plan document
(https://claude.ai/artifact/LPZiix9JRzgfEmVHVnsfny, private to the team).
This page is the working summary: what is done, what is left and when the
launch counts as complete. Status is as of **19 November 2026**.

## Dates

The ball's date wasn't confirmed when the plan was written; the plan assumes a
date between 13 and 31 December:

- **Code freeze:** Saturday 12 December. After it, only fixes for launch
  blockers.
- **Dry run:** around Friday 11 December, on production, with a test event.
- Confirm the date with KST and move these if it differs.

## Batches

| Batch | Contents | Status |
| ----- | -------- | ------ |
| B1 | Monitoring (Sentry), caching, SQL performance | On main, live |
| B2 | Paged swipe deck and guest list, users-row fallback | On main, live; the paging migration's state is unconfirmed |
| B3 | QR join flow (`/e/[id]?src=pNN`, pending join, check-in radius setting) | On main, live |
| B4 | Sign-in robustness (email code, in-app browsers, 429 retries), 5-step onboarding, socket push, feed cache | On main, live; its foreign-key index migration is not applied |
| B5 | Consent log, attribution, match archive, moderation views and runbook, misdated-events guard | On main, live; 2 migrations and 1 data fix not applied; privacy wording awaits approval |
| B6 | Redis socket adapter, load-test kit | On main, live; the staging load runs are not done |
| B7 | Server-side check-in, deletion and child-safety pages, landing copy, poster kit, 18+ on the API | On main, live; copy awaits approval |
| P2s | QR-8 "You're at {event}. Join?" on the feed for guests who arrive without the link; BUG-042 going count refreshed every 30 s on event details | Committed 19 November as 8263efb; checked in the browser against a stand-in API; the prompt's copy awaits approval |
| B8 | Native-app availability | January |

## Owner tasks (not code)

- **DNS:** move tulum-app.com to Cloudflare, then add the Clerk production
  CNAME records (DNS only).
- **Clerk production:** Google and Apple production credentials, the mobile SSO
  redirect allowlist; then switch the apps' keys to the production instance.
  The development instance caps at 100 users, so this blocks the launch.
- **Plans:** Supabase Pro and a staging project; Vercel Pro (Hobby is for
  non-commercial use only).
- **Pictures:** the R2 custom domain `img.tulum-app.com` (the `r2.dev` address
  is rate-limited) and the data fix `20261111_r2_custom_domain_urls.sql`.
- **Database writes:** applying the migrations and data fixes below (agents
  can't).
- **Copy:** approve the privacy wording (B5) and the landing and poster copy
  (B7).

## Database changes waiting to be applied

In order, from `apps/api/supabase/`:

1. `migrations/20261111210742_paged_swipe_deck_and_guest_list.sql` (check
   whether it is applied: `get_swipe_deck` with a cursor argument)
2. `migrations/20261114152119_index_foreign_keys.sql`
3. `migrations/20261114204309_consent_attribution_archive.sql`
4. `migrations/20261114204310_moderation_views.sql`
5. `data-fixes/20261114_bug041_misdated_instagram_events.sql`
6. `data-fixes/20261111_kst_venue.sql` and `20261111_kst_maskenbal_event.sql`
   (the venue's position and the event), once the date is known
7. `data-fixes/20261111_r2_custom_domain_urls.sql`, once the custom domain
   serves the bucket

## Completion criteria

The launch is complete when every item holds. Each line names how to check
it.

**Code and deploys**

- [ ] B1–B7 are on `main` and every production deploy runs that commit:
      GitHub statuses green, `/api-json` lists the newest routes, the site's
      and web app's bundles contain the newest strings
      ([deployment.md](deployment.md#checking-that-a-push-went-live)).
- [ ] No open launch-blocker bug in the QA report; every Fixed entry was
      checked on production.
- [ ] The workspace checks match the baselines in [testing.md](testing.md),
      and knip reports nothing.

**Data**

- [ ] Every migration and data fix above is applied, checked with a read-only
      query each (the function, table, view or rows it adds).
- [ ] The KST venue has its real position and the Maskenbal event its real
      times; `CHECKIN_RADIUS_METERS` matches the venue survey.

**Accounts and infrastructure**

- [ ] Clerk production is live and both apps use its keys; Google, Apple and
      email-code sign-in work on iPhone Safari, Android Chrome and the
      Instagram in-app browser.
- [ ] Supabase Pro and Vercel Pro are active; Redis is reachable from every
      API instance.
- [ ] Pictures are served from `img.tulum-app.com`.

**Load and reliability**

- [ ] The k6 scenario in [loadtest/](../loadtest/README.md) passes on staging
      at the planned peak (2,000 seeded attendees, real Clerk tokens) within
      its thresholds, with no 5xx bursts.
- [ ] Sentry receives errors from the API and the web app, with alerts to a
      person who is at the event.

**Content and legal**

- [ ] Privacy wording, landing copy and poster copy are approved and live.
- [ ] `/delete-account` and `/child-safety` are reachable from the site and
      the app.
- [ ] The posters are printed with the final QR links, each `src` code
      recorded.

**Operations**

- [ ] The dry run passed end to end on production: scan a poster, sign up,
      onboard, join, check in at the venue, swipe, match, chat, report a guest,
      delete the test account.
- [ ] Code freeze is in place, and the [moderation runbook](moderation-runbook.md)
      has named people for the night.

## Open questions

- **GoOut coverage.** The GoOut scraper skips the "Ostalo" and "Pozorišta"
  categories (288 of 394 listings on 17 November) and runs twice a week.
