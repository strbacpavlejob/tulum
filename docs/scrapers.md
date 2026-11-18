# Scrapers

The API imports Belgrade's events and venues from four sources. Each scraper
implements the `Scraper` interface (`apps/api/src/scrape/domain/scraper.interface.ts`)
and has a config in `scrape/domain/scraper-config.ts` (id, delays, image
policy, venue-type mapping, which event types to keep).

| Id | Source              | Code                                   | Reads                                  |
| -- | ------------------- | -------------------------------------- | -------------------------------------- |
| 1  | GoOut               | `scrapers/go-out/`                     | goout.rs API, categories restaurants, bars, clubs, splavovi, kafane |
| 2  | Guest List Serbia   | `scrapers/guest-list/`                 | guestlist-serbia.com pages             |
| 3  | Instagram (Apify)   | `scrapers/instagram/`, `instagram/`    | Venues' posts via Apify, parsed by OpenAI |
| 4  | EventZeka           | `scrapers/eventzeka/`                  | eventzeka.com pages only (robots.txt disallows `/api/`) |

## When they run

`ScrapeCronService` (server time): Monday 10:30 runs sources 1, 2 and 4;
Thursday 10:30 runs 1, 2, 3 and 4. Admins can also run all of them
(`GET /scrape`) or one (`GET /scrape/:scraperId`). After each run, past events
that have no matches are deleted (`CleanupService.deleteOldEvents`); events
with matches stay.

## One run

1. `ScraperService` loads the venues (with contacts) and events already in the
   database (`ScrapedDataService`).
2. The scraper returns venues and events.
3. `DuplicateCheckerService` drops what the database already has and points
   kept events at the stored venue's id.
4. `ScrapedDataService.saveScrapedData` upserts venues (by name), venue
   contacts and events (by title, venue and start).

## Duplicates

`DuplicateCheckerService` with the scoring helpers in
`duplicate-checker/venue-similarity.ts`:

- **Venues** match on the same Instagram account or phone number, or on a
  weighted score of position (within 150 m), name, address and contact, or:
  - the same name (or alias) within 1 km;
  - the same name without filler words ("club", "bar", "kafana", "belgrade",
    …) within 300 m.

  Venue names are unique in the database, so a match must not be saved again
  under its own name.
- **Events** match on the same venue, a similar title and a start within
  2 hours.

## Venue types and positions

- Each source's categories map to `bar`, `club`, `restaurant`, `tavern`,
  `cafe` or `event_venue` (`venueTypeMapping`). EventZeka calls most venues
  just "venue": a club night makes its venue a club, and otherwise words in the
  name decide ("Jazz bar …" is a bar).
- A venue without a position is never put at the city centre. EventZeka
  venues with a street address are placed by Nominatim (`GeocoderService`,
  1 request/s, building-level results only); the rest are skipped.

## Adding a source

1. Add the source to `ScraperSource` and `SCRAPER_CONFIGS` with a new id.
2. Write a service implementing `Scraper` under `scrapers/<source>/`, with a
   spec over saved pages (see `eventzeka-scraper.service.spec.ts`).
3. Register it in `scrape.module.ts`, `ScraperService` and the cron.
4. Check one run against the live site without saving (a dry run) before it
   runs on a schedule.
