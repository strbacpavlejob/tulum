# Tulum documentation

Tulum matches guests who are at the same event. A guest picks an event in
Belgrade, joins it, checks in at the venue, and can then swipe on the other
guests checked in there. Two likes make a match and a chat that lasts six hours.
Venues and their hosts publish events from a web dashboard, and scrapers import
the city's nightlife listings.

This folder is the single source of truth for how the product works and how to
build, test and ship it. App READMEs only point here.

| Read this                                  | For                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------ |
| [architecture.md](architecture.md)         | The monorepo, the three apps, how they talk, where code goes             |
| [business-logic.md](business-logic.md)     | The product rules: events, tickets, check-in, deck, likes, matches, chat |
| [scrapers.md](scrapers.md)                 | Where imported events and venues come from and how duplicates are caught |
| [local-development.md](local-development.md) | Setting up and running the apps on your machine                        |
| [testing.md](testing.md)                   | Checks per app, their known baselines, browser and emulator testing      |
| [deployment.md](deployment.md)             | Vercel, Railway, Supabase and Clerk: how a change reaches production     |
| [launch-plan.md](launch-plan.md)           | The KST Maskenbal web launch: batches, status and completion criteria    |
| [conventions.md](conventions.md)           | File and folder naming, folder structure, where code goes               |
| [refactoring.md](refactoring.md)           | The safe order for cleanups and the dead-code check                      |
| [images-and-storage.md](images-and-storage.md) | Picture sizes, the upload path and Cloudflare R2                     |
| [moderation-runbook.md](moderation-runbook.md) | Handling guest reports before and during an event                    |
| [instagram-posts.md](instagram-posts.md) | The weekly Instagram carousels, the daily Stories, the publishing history they share, and their setup |

Tool-specific instructions live next to the tools: [loadtest/README.md](../loadtest/README.md)
and [scripts/poster-kit/README.md](../scripts/poster-kit/README.md).

## For AI coding agents

1. Read [AGENTS.md](../AGENTS.md) first. Its rules are binding: Supabase access
   is read-only, Clerk reads only, no credentials typed into any app, and the
   real API is never started by an agent (its scheduled jobs write).
2. Find the app and feature in [architecture.md](architecture.md), and the rule
   you are touching in [business-logic.md](business-logic.md).
3. Before changing code, run that app's checks from [testing.md](testing.md)
   and compare against the baselines listed there. Many errors already exist
   and are not regressions.
4. Name and place new files as [conventions.md](conventions.md) says. Keep
   changes behavior-preserving unless the task says otherwise, and follow the
   order in [refactoring.md](refactoring.md) for any cleanup.
5. Project skills in `.agents/skills/` (also at `.claude/skills/`) cover Clerk
   auth (`tulum-clerk-api-auth`), matching (`tulum-matching-reliability`) and
   frontend styling (`tulum-frontend-patterns`). Use them when they apply.
6. When something here is wrong or missing, fix the doc in the same change.
