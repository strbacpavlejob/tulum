# Weekly Instagram posts

The API posts the week's events on Tulum's Instagram account as carousels: a
cover, one slide per event (its picture, title, day and time, venue and a
capybara) and a closing slide with tulum-app.com. The code is in
`apps/api/src/instagram-posts/`.

## Schedule

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

## Which events

- Active events that start between the run and Sunday midnight, at venues the
  scrapers imported, with a picture in R2. Venues made in the dashboard are
  left out: so far every one of them is a test venue (Tulum Test Venue, Mock
  Club Tulum, Tulum Swipe Club), and development and production share the
  database. When real venues sign up in the dashboard, test venues need a
  marker before their events can be posted.
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

## Slides

- 1080×1350 JPEGs (4:5), sRGB, 150–300 KB each.
- [Satori](https://github.com/vercel/satori) lays a slide out and turns its
  text into shapes, and sharp draws it, so Railway needs no fonts installed.
  The font is Nunito (`@fontsource/nunito`), one file per alphabet. Each
  file is registered under its own name, because Satori only falls back to a
  font with a different name, and Serbian Latin and Cyrillic titles need the
  fallback. Emoji are left out of slide text; the caption keeps them.
- The capybaras are in `apps/api/assets/instagram-posts/`, copied from the
  landing page (`apps/host/public/images/mascots`): bars have the one with
  sunglasses and a drink, clubs the disco ball, culture the ticket, food the
  magnifying glass, and the closing slide the phone. Food and cafés have no
  picture of their own yet.
- Event pictures are the stored 500×375 copies, shown at 840×630, so they are
  a little soft, and posters are cropped to 4:3 as they were at import.
- The slides are stored in R2 under `instagram-posts/<date>-<kind>-<run>/`
  while Instagram fetches them, and deleted after. A dry run's stay under
  `instagram-posts/preview/` until the next dry run.

## Caption

A heading with the dates, a line per event with the venue's Instagram
tagged, a line on how Tulum works, and hashtags. It keeps within Instagram's
limits (2,200 characters, 30 hashtags, 20 @ tags); a title's own @ and # are
dropped, so only the venues are tagged. Each venue is also tagged on its
slide. Meta's docs don't say whether a carousel's slides take user tags, so
a slide whose tags are refused is posted untagged.

## Publishing

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
- **Limits:** 50 posts a day through the API (one page says 100) and 400
  containers a day. Five posts a week stay far below.
- **Cost:** nothing. No Apify (its only Instagram poster logs in with a
  browser cookie and posts one picture per run), no paid API.

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

## Admin routes

| Route | What it does |
| ----- | ------------ |
| `GET /instagram-posts/plan?kind=` | The events and caption of a post (by default today's), the schedule, whether Instagram and R2 are set up, and today's record. Changes nothing. |
| `POST /instagram-posts/publish?kind=&dryRun=true` | Draws the post and stores its slides to look at; posts nothing. Without `dryRun`, publishes now, once a day per kind. |

## Not built yet

- Events at venues made in the dashboard (see above).
- Collaborator posts with venues: not tried. Meta's overview documents
  collaborators for Facebook Login.
- English only; the caption and slide text await approval.
- Sharper pictures: storing a larger copy of event pictures at import.
