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
that have no matches are deleted with their pictures
(`CleanupService.deleteOldEvents`); events with matches stay. Then the
pictures the run saved are stored in R2 ([below](#pictures-from-sources)).

## One run

1. `ScraperService` loads the venues (with contacts) and events already in the
   database (`ScrapedDataService`).
2. The scraper returns venues and events.
3. `DuplicateCheckerService` drops what the database already has and points
   kept events at the stored venue's id.
4. `ScrapedDataService.saveScrapedData` upserts venues (by name), venue
   contacts and events (by title, venue and start). A picture is saved as
   the source links it.
5. Past events without matches are deleted, and their pictures in R2.
6. `ExternalPicturesService` stores the saved pictures in R2 and points the
   rows at them.

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

## Pictures from sources

No event or venue picture stays a link to another site. Instagram's picture
URLs expire within days, and other sites change or drop theirs, so
`ExternalPicturesService` (`external-pictures/`) stores every `picture_url`
that isn't in the R2 bucket:

- It runs at the end of each scrape run and every hour at :40 (server time),
  which tries failed downloads again and takes what a run left. A run with
  nothing to store only reads the database.
- Each picture is downloaded (5 MB at most, as a browser asks for it),
  cropped to WebP like a host's upload (events 500×375, venues 200×200) and
  stored under the row's own key: `event-images/scraped/<eventId>/picture.webp`
  or `venue-images/scraped/<venueId>/picture.webp`. The update checks that
  `picture_url` is still the source's, so a host's upload made meanwhile is
  kept (the stored copy is then deleted).
- Venues go first, as their pictures stand in for their events', then
  upcoming events, then past ones; 200 a run.
- A picture that answers 404 or 410 is gone: `picture_url` is cleared, so the
  event shows its venue's picture, and the venue picture job can fill a
  venue's. Other failures (a timeout, a 5xx, a 403, a page that isn't a
  picture) are tried again every run and cleared after a day (Redis key
  `external-pictures:failing`).

The scraper configs' `imagePolicy` only says whether a source's picture is
saved (`STORE_IN_R2`) or left out (`KEEP_EMPTY`).

On 24 November 2026 it had 144 event pictures (106 from eventzeka.com, 26
from assets.tickets.rs, 12 from firebasestorage.googleapis.com) and 8 venue
pictures (framerusercontent.com, assets.tickets.rs) to move.

Admins can check and run it by hand:

- `GET /external-pictures/pending` counts the pictures still on other sites,
  by site, and how many are failing.
- `POST /external-pictures/store` runs it now; with `?dryRun=true` it
  downloads the pictures and saves nothing.

## Venue pictures

Most imported venues had no picture: EventZeka and Guest List Serbia give
none (`imagePolicy: KEEP_EMPTY`) and GoOut's are sometimes missing. On 24
November 2026, 463 of the 643 imported venues had none, and 442 of those had
an Instagram handle. Guests see the gap as an empty circle on event details
and on map pins.

`VenuePicturesCronService` (`venue-pictures/`) fills them every hour at :20
(server time), so a venue a scrape imports gets its picture within the hour.
For each imported venue (`scraper` set) whose `picture_url` is null or empty:

1. **A venue without a handle** is searched for by name on Google Maps,
   around its position, through Apify (`compass/crawler-google-places`, with
   the contacts enrichment, which reads each place's website). A place is
   the venue when it is open, within 300 m, and has the venue's name, as
   the duplicate checker compares names or differing only in spacing; within
   150 m, one name inside the other is enough. The handle is the Instagram
   profile the listing gives as its website, or else a profile its website
   links to whose handle is like the venue's name (a footer can link the
   agency that built the site). The handle is saved on the venue's contact,
   or on a new contact, unless another venue already has it
   (`venue-picture-rules.ts`).
2. **The profile picture** comes from Apify's `apify/instagram-profile-scraper`.
   The larger picture is downloaded (Instagram's picture URLs expire, so
   pictures are stored, never linked), cropped to 200×200 WebP and stored in
   R2 at `venue-images/scraped/<venueId>/instagram-profile.webp`. Instagram's
   blank avatar is skipped.
3. **Only an empty picture is filled.** The update checks that `picture_url`
   is still empty, so a host's upload is never replaced. Venues hosts created
   themselves are left to them.

Venues with an upcoming event go first. A run looks up at most
`VENUE_PICTURES_PROFILES_PER_RUN` profiles (default 200) and
`VENUE_PICTURES_GOOGLE_MAPS_SEARCHES_PER_RUN` venues on Google Maps (default
25); 0 turns that step off.

### Staying on Apify's free plan

Apify's free plan includes $5 of usage a month, and blocks the account
when it is used up until the next billing cycle starts, the weekly
Instagram posts scrape included. So the job spends only within a budget
(`apify-budget.ts`):

- A run with no venue due, which is most hourly runs, asks Apify nothing.
- Otherwise it first reads the account's usage in its billing cycle from
  Apify (`GET /v2/users/me/limits`, free). It spends only while that is
  under `VENUE_PICTURES_APIFY_BUDGET_USD` (default $3.50, leaving $1.50 for
  the posts scrape, about $0.25 a month, and manual runs), or under the
  account's own monthly limit if that is lower. 0 stops all spending. When
  the usage can't be read, nothing is looked up.
- Each run is sized to what is left and capped at it (`maxTotalChargeUsd`):
  $0.005 a profile and $0.03 a Google Maps search, about twice the free
  plan's prices in November 2026 ($0.0026 a profile; $0.004 a place, plus
  $0.002 for its contacts and up to $0.002 for its details). The Google Maps
  actor takes no run capped below $0.50, so venues without a handle wait
  until that much is left. The usage is read again after a Google Maps run.
- What was tried waits before it is tried again (Redis key
  `venue-pictures:tried`): 30 days when nothing was found (no listing, no
  profile, no picture), 7 days after a failed download, and 6 hours after a
  failed Apify run or upload. A run stopped by its cap or timeout counts the
  venues it didn't reach as failed, not as having nothing.

The first backfill of 441 profiles and 21 searches costs about $1.70 and
takes about three hourly runs. After that the job pays only for the venues
new scrapes import and for misses tried again after 30 days, about $1 a
month at most.

Admins can check and run it by hand:

- `GET /venue-pictures/missing` counts the venues without a picture and
  shows the Apify usage against the budget (`apifyBudget`). It is free:
  nothing is looked up.
- `POST /venue-pictures/fill` runs the job now, within the same budget.
  With `?dryRun=true` it looks the venues up and downloads their pictures but
  saves nothing (no picture, handle or retry record); Apify still charges for
  the lookups.

The older manual refreshes (`POST /instagram/refresh-logos/:scraper` and a
host's `POST /venues/:id/refresh-instagram-picture`) read profiles through
storiesig.info in Puppeteer instead, and replace the picture a venue has.

## Adding a source

1. Add the source to `ScraperSource` and `SCRAPER_CONFIGS` with a new id.
2. Write a service implementing `Scraper` under `scrapers/<source>/`, with a
   spec over saved pages (see `eventzeka-scraper.service.spec.ts`).
3. Register it in `scrape.module.ts`, `ScraperService` and the cron.
4. Check one run against the live site without saving (a dry run) before it
   runs on a schedule.
