# Instagram posts and Stories

The API promotes events on Tulum's Instagram account in two ways:

- **Weekly posts:** the week's events as carousels, Monday to Friday
  evenings. A carousel has a cover, one slide per event (its picture, title,
  day and time, venue and a capybara) and a closing slide with
  tulum-app.com.
- **Stories:** two or three events of the next 48 hours, three times a day,
  one story per event ([Stories](#stories)).

The two share a [publishing history](#publishing-history) in the database,
so an event is promoted once: in a story or in a post. The code is in
`apps/api/src/instagram-posts/`.

## Weekly posts

### Schedule

| Day (Belgrade) | Post                                          | Venue types            |
| -------------- | --------------------------------------------- | ---------------------- |
| Monday         | This week in Belgrade: every group, in turns  | all below              |
| Tuesday        | Concerts & culture                            | `event_venue`          |
| Wednesday      | Restaurants & cafés                           | `restaurant`, `cafe`   |
| Thursday       | Bars & taverns                                | `bar`, `tavern`        |
| Friday         | Clubs & nightlife                             | `club`                 |

- The scrapers run on Monday and Thursday mornings, and Monday's brings in
  most of the week's events: on a Wednesday only 18 of the next week's events
  were known (25 November 2026). So the week's post waits for Monday evening,
  and the clubs for Friday, after Thursday's scrape.
- The cron runs at 18:05 Belgrade time and again every hour until 21:05. A
  day's post goes out once: the runs after it find it recorded and stop.
- `INSTAGRAM_POSTS_SCHEDULE` changes the days, e.g. `mon:week,fri:clubs`
  (kinds: `week`, `bars`, `clubs`, `food`, `culture`); `off` stops the posts.

### Which events

- Active events that start between the run and Sunday midnight, at venues the
  scrapers imported, with a picture in R2. Venues made in the dashboard are
  left out: so far every one of them is a test venue (Tulum Test Venue, Mock
  Club Tulum, Tulum Swipe Club), and development and production share the
  database. When real venues sign up in the dashboard, test venues need a
  marker before their events can be posted.
- Events a story or an earlier post promoted are left out, and so are other
  events with their title ([publishing history](#publishing-history)). So
  Tuesday's culture post doesn't repeat the culture events of Monday's week
  post, and a post doesn't repeat what the morning's stories showed.
- Events more guests are going to come first; among equals, events on days
  the post has fewer events on, so that a post isn't all Thursday while
  nobody has joined anything yet. A venue appears once, and so does a title.
  The week's post takes the groups in turn, so the bars, which have about two
  thirds of a week's events, don't fill it.
- A post has at most `INSTAGRAM_POSTS_MAX_SLIDES` slides (default 10: 8
  events), and goes out only with at least 3 events. Meta's publishing guide
  allows 20 slides, but its error table still says 10, so raise it only
  after one post with more has gone through.
- An event whose picture won't download is swapped for the next pick.

### Slides

- 1080×1350 JPEGs (4:5), sRGB, 150–300 KB each.
- [Satori](https://github.com/vercel/satori) lays a slide out and turns its
  text into shapes, and sharp draws it, so Railway needs no fonts installed.
  The font is Nunito (`@fontsource/nunito`), one file per alphabet. Each
  file is registered under its own name, because Satori only falls back to a
  font with a different name, and Serbian Latin and Cyrillic titles need the
  fallback. Emoji are left out of slide text; the caption keeps them.
- The capybaras are in `apps/api/assets/instagram-posts/`, one per venue
  type, and an event's slide shows its venue's: a martini for bars, a beer
  for taverns, a disco ball for clubs, a knife and fork for restaurants, a
  latte for cafés and headphones for event venues. A post's cover shows its
  first venue type's (the bars' cover has the martini). The week's cover
  (the ticket) and the closing slide (the phone) have the landing page's
  (`apps/host/public/images/mascots`). They are 720-px WebPs with
  transparency, named `mascot-<venue type>.webp` and listed in
  `MASCOT_FILES` (`instagram-slides.ts`).
- Event pictures are the stored 500×375 copies, shown at 840×630, so they are
  a little soft, and posters are cropped to 4:3 as they were at import.
- The slides are stored in R2 under `instagram-posts/<date>-<kind>-<run>/`
  while Instagram fetches them, and deleted after. A dry run's stay under
  `instagram-posts/preview/` until the next dry run.

### Caption

A heading with the dates, a line per event with the venue's Instagram
tagged, a line on how Tulum works, and hashtags. It keeps within Instagram's
limits (2,200 characters, 30 hashtags, 20 @ tags); a title's own @ and # are
dropped, so only the venues are tagged. Each venue is also tagged on its
slide. Meta's docs don't say whether a carousel's slides take user tags, so
a slide whose tags are refused is posted untagged.

### Publishing (posts and stories)

- Before publishing, a post claims its events in the
  [publishing history](#publishing-history). An event a story claimed in
  the meantime drops out of the post (with fewer than 3 left, the post waits
  for the next hourly run).
- Through Instagram's API (Graph API v27.0, or
  `INSTAGRAM_GRAPH_API_VERSION`): a container per slide, one for the
  carousel with the caption, a wait until Instagram has processed them, then
  `media_publish`.
- **Two setups, told apart by the token.** Tulum's app uses Unified login,
  the only setup Meta's dashboard gives new apps since late 2026: its
  system-user token (it starts with `EAA`) is used at `graph.facebook.com`,
  and the account comes from `/me/assigned_instagram_accounts`. A token from
  the older Instagram Login setup (it starts with `IG`) is used at
  `graph.instagram.com`, with the account from `/me`.
- **Once per day and kind.** Before publishing, a run claims the day's
  record in Redis (`instagram-posts:published:<date>:<kind>`). A published
  post is recorded for 8 days. A failed one releases the claim, and the next
  hourly run tries again. If `media_publish` gives no clear answer (a
  timeout or a server error), the post may have gone out: the record stays,
  so nothing posts twice. Look at the account, and delete the key to post
  again. While Redis doesn't answer, nothing is posted.
- **Token.** Unified login's system-user token never expires, so the API
  never renews it; it stops working only if the app loses the account (the
  tester role or the business portfolio's access is removed). An Instagram
  Login token lasts 60 days: before a post, the API renews it once a week
  (`refresh_access_token`) and keeps the new one in Redis
  (`instagram-posts:token`), tied to the `INSTAGRAM_ACCESS_TOKEN` it came
  from, so setting a new token on Railway replaces it. A token that stopped
  working shows in the logs as "set a new INSTAGRAM_ACCESS_TOKEN".
- **Limits:** 50 posts a day through the API (one page says 100; stories
  count too, as far as the docs tell) and 400 containers a day. A day's post
  and 9 stories stay far below.
- **Cost:** nothing. No Apify (its only Instagram poster logs in with a
  browser cookie and posts one picture per run), no paid API.

## Stories

### When

- At 10:00, 15:00 and 18:00 Belgrade time (`INSTAGRAM_STORIES_SCHEDULE`,
  e.g. `9:30,13:00,18:00`; `off` stops them).
- The cron looks every five minutes, so the times can change without a
  deploy. A time's run (a *slot*) can go out until 45 minutes after it, which
  also covers a restart during a deploy. A slot runs once: its record in
  Redis (`instagram-stories:slot:<date>T<time>`) stops the later ticks, and
  so does the history, should the record be lost.
- A slot whose run published nothing because Instagram or the database
  failed is tried again 10 and 30 minutes after its time, then left until
  the next slot. Only one story run publishes at a time
  (`instagram-stories:lock` in Redis); while Redis doesn't answer, nothing is
  posted.

### Which events

- **Eligible:** active (the Instagram venue scraper's unchecked events are
  drafts) and starting between an hour after the run (a story stays up for a
  day, so one for an event starting sooner would outlive it) and 48 hours
  after it (`INSTAGRAM_STORIES_WINDOW_HOURS`, 2 to 168). The same checks as
  the posts' make an event fit to promote: an imported venue of one of the
  six venue types, a picture in R2, a title with text once emoji are left
  out. The schema has no other validation flag.
- **Not promoted yet:** an event in the history, from a story or a post, is
  left out, and so is another event with its title. With nothing left the
  slot is skipped: stories never repeat an event.
- **How many:** two or three, at random each run (`INSTAGRAM_STORIES_EVENTS`:
  `2-3`, or one number such as `3`; at most 10).
- **Picked at random, for variety:** never two events at one venue or with
  one title; each pick from a group (bars, clubs, food, culture) the run
  hasn't shown yet when there is one, and at a venue the last day's stories
  didn't show when there is one. A pick takes a group at random, then a
  venue in it, then one of its events, so the bars, which have most of the
  events, don't fill the stories, and a venue with ten events has the
  chance of one with a single event.
- **Supply:** a weekend has about 140 eligible events in 48 hours; weekdays
  before Monday's scrape have 7 to 11 (26 November 2026). Nine stories a day
  use the weekday ones up within a day or so, and the stories then skip
  until the next scrape.

### The picture

- 1080×1920 JPEG (9:16, what Instagram recommends for stories), drawn like
  the slides: the event's picture on a card over a blur of it, a
  *Tonight*/*Today*/*Tomorrow*/weekday label, the group, title, day and time
  and venue, the venue type's capybara, and a *Join on tulum-app.com* button.
- Instagram covers a story's top 250 px (the account and progress bars) and
  bottom 280 px (the reply field), so the text and the button keep to the
  band between them (`STORY_SAFE_TOP`, `STORY_SAFE_BOTTOM` in
  `instagram-slides.ts`).
- Instagram's API can't add stickers (a link, a poll, a location), so the
  call to action is part of the picture, and the story mentions the venue's
  account (a mention takes no position on a story).
- The pictures are stored in R2 under `instagram-stories/<slot>-<run>/`
  while Instagram fetches them, and deleted after; a dry run's stay under
  `instagram-stories/preview/` until the next dry run.

### Publishing a story

1. The run claims its events in the history (status `publishing`). An event
   another run claimed meanwhile, or whose picture won't download, is
   swapped for another pick.
2. For each event, in date order: draw the picture, store it, make a
   container (`media_type=STORIES`), wait until Instagram has fetched it,
   then `media_publish`.
3. Only when Instagram confirms the story (`media_publish` answers with its
   id) is the event marked `published`, with the media id and link. If
   Instagram refused the story, the claim is deleted and the event can be
   promoted later; the run stops there, as the next story would most likely
   fail the same way, and lets its other claims go. If `media_publish` gave
   no clear answer (a timeout or a server error), the story may be up: the
   event is marked `unknown` and not promoted again, and the slot isn't
   tried again.
4. A container call that gets a server error or no answer is tried again
   after 2 and 5 seconds; `media_publish` never is, as a second call could
   post twice.

### Logs

Each happening is one line, `instagram-stories.<name>` followed by its
fields as JSON, e.g.
`instagram-stories.story-published {"slot":"2026-11-27T10:00","eventId":"…","mediaId":"…","permalink":"…"}`.
The names: `story-published`, `story-failed`, `story-unknown`,
`run-finished` (counts per run), `nothing-to-publish`, `event-taken`,
`picture-not-downloaded`, `slot-retrying`, `slot-given-up`,
`not-published` (Redis or the database failed), `not-configured`,
`history-not-written` and `pictures-not-deleted`. Search Railway's logs for
`instagram-stories.`.

## Publishing history

`social_media_publications`
(`migrations/20261126213507_social_media_publications.sql`) has a row per
event a story or a post promoted: the event, the platform (`instagram`), the
format (`story` or `feed`), the run (`story:<slot>:<run>` or
`feed:<date>:<kind>:<run>`), the status, and once published the media id,
link and time.

- **Once per event.** Its unique key (event, platform) lets an event be
  promoted once on Instagram, in a story or in a post, whichever comes
  first. Runs claim their events by inserting rows that skip events already
  there, so two runs can't take the same event, whichever job they belong
  to.
- **Statuses.** `publishing` while a run publishes; `published` once
  Instagram confirmed; `unknown` when `media_publish` gave no clear answer.
  All three keep the event from being promoted again. Rows of failed posts
  are deleted. A run that dies between claiming and publishing leaves its
  rows `publishing`: those events stay out, which errs on the side of no
  repeats. To promote such an event again, delete its row.
- **Rows go with their event** (`ON DELETE CASCADE`).
- **Before the migration is applied** the weekly posts go out as before,
  without the history, and the stories don't go out (each slot logs
  `not-configured` once, and the plan route says what to apply). Agents
  can't apply it; a maintainer runs it in the SQL editor.

## Setup

Done on 26 November 2026: the Meta app **Tulum Posts**, owned by the
business portfolio **Tulum**, with tulum_app as its Instagram tester. To do
it again, or for another account:

1. **Instagram.** The account must be a professional account (Business or
   Creator): Settings → Account type and tools → Switch to professional
   account. tulum_app already is.
2. **Meta app.** Register at https://developers.facebook.com with a Facebook
   account in good standing (Meta confirms it with a phone number), then
   create an app with the use case "Manage messaging & content on
   Instagram", without a business portfolio for now.
3. **Business portfolio.** In the app, Use cases → Customize → API setup
   with Unified login asks for one: create it there. Verification isn't
   needed for your own account.
4. **Configuration.** In step 1 of that page, create the configuration from
   the template. Then, under Facebook Login for Business → Configurations →
   Edit, keep only the Instagram accounts asset and the permissions
   `instagram_basic` and `instagram_content_publish`; the template also asks
   for ads, comments and messages. Its token is a system-user token that
   never expires.
5. **Tester.** App roles → Roles → Add People → Instagram Tester → the
   account. Then, in Instagram, Settings → Apps and websites → Tester
   invites → Accept. Meta's docs say an app that serves only your own
   account needs Standard Access, which every app gets: no App Review and
   no Business Verification.
6. **Token.** Back on the Unified login page, step 2 (Generate access
   tokens) lists the account with its ID. Click Generate token and copy it.
7. **Look first.** With an admin account, `GET /instagram-posts/plan` shows
   today's events and caption, and
   `POST /instagram-posts/publish?kind=week&dryRun=true` draws the slides and
   returns their links. Neither needs the token.
8. **Railway.** In the `tulum-api` service's Variables, set
   `INSTAGRAM_ACCESS_TOKEN`, and `INSTAGRAM_USER_ID` to the account ID from
   step 6 (without it, the API asks Meta for it). From then on the schedule
   posts by itself; the first post goes out at the next scheduled 18:05, or
   now with `POST /instagram-posts/publish?kind=<kind>`. Optional:
   `INSTAGRAM_POSTS_SCHEDULE`, `INSTAGRAM_POSTS_MAX_SLIDES` and
   `INSTAGRAM_GRAPH_API_VERSION`.
9. **Stories.** Apply the publishing history's migration (see above); the
   stories use the same token and start at the next slot. Optional:
   `INSTAGRAM_STORIES_SCHEDULE`, `INSTAGRAM_STORIES_EVENTS` and
   `INSTAGRAM_STORIES_WINDOW_HOURS`. `GET /instagram-stories/plan` shows
   whether everything is set up, and
   `POST /instagram-stories/publish?dryRun=true` draws a run's stories to
   look at.

## Admin routes

| Route | What it does |
| ----- | ------------ |
| `GET /instagram-posts/plan?kind=` | The events and caption of a post (by default today's), the schedule, whether Instagram and R2 are set up, and today's record. Changes nothing. |
| `POST /instagram-posts/publish?kind=&dryRun=true` | Draws the post and stores its slides to look at; posts nothing. Without `dryRun`, publishes now, once a day per kind. |
| `GET /instagram-stories/plan` | The stories' schedule and settings, whether Instagram, R2 and the history are set up, the slot running now and its record, the events a run now could show with a random pick from them, and the last day's stories. Changes nothing. |
| `POST /instagram-stories/publish?dryRun=true` | Draws a run's stories and stores them to look at; posts nothing. Without `dryRun`, publishes a run now, outside the schedule, under the same rules (no event twice). |

## Not built yet

- Events at venues made in the dashboard (see above).
- Collaborator posts with venues: not tried. Meta's overview documents
  collaborators for Facebook Login.
- English only; the caption, slide and story text await approval.
- Link stickers on stories: Instagram's API doesn't publish stickers.
- Story metrics (views, link taps): not read yet. Meta keeps them for 24
  hours only.
- Sharper pictures: storing a larger copy of event pictures at import.
