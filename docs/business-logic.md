# Business logic

The rules the product follows, and where each one is enforced. The API is the
authority; the apps repeat some checks only to show the right screen early.
Values below are as of November 2026: check the named file before relying on
one.

## People

- **Guests** use the app. They sign in with Google, Apple or an email code
  (Clerk), then finish a short onboarding: first name, birthday, gender, who
  they want to meet, and at least one photo
  (`apps/mobile/components/onboarding/onboarding-steps.ts`). Onboarding counts
  as complete once gender and "interested in" are set
  (`GuestsService`, `isOnboardingComplete`).
- **Age.** Tulum is 18+. The API refuses a younger birthday
  (`guests/dto/onboarding.dto.ts`) and the app's picker stops 18 years back.
- **Photos.** Up to 3, stored as 800×600 WebP (`guests.service.ts`); see
  [images-and-storage.md](images-and-storage.md).
- **Hosts** run venues and publish events from the dashboard (apps/host).
  A host owns their venues; event routes check that ownership
  (`EventsCrudService.assertVenueOwnership`).
- **Tulum admins** (`AdminGuard`) review reports and run maintenance routes.

## Events and joining

- An event belongs to a venue and has a status: `draft`, `active` or
  `cancelled`. Only active events appear in the guest feed.
- **Feed** (`GET /events/active`, public): active events in the requested date
  range, with map pins per venue. What is the same for every caller is cached
  in Redis for 45 seconds; favorites, "seen" and attending are read per request
  (`EventsFeedService`). Opening event details as a signed-in guest records a
  "seen" engagement.
- **Joining** an event creates a ticket (free). When the venue requires a
  reservation, the app first shows the venue's contacts (phone, SMS, Viber,
  WhatsApp, Instagram) in a reservation modal.
- **QR posters** link to `https://mobile.tulum-app.com/e/{eventId}?src=pNN`.
  The page joins the event after sign-in, and the poster code is kept as the
  guest's first source (attribution, recorded once).

## Check-in

Matches and chat are for guests who are at the event. A check-in
(`POST /events/sessions`, `EventsController` with `events/check-in-rules.ts`)
needs all of:

1. a ticket for the event;
2. the event on now: from 5 minutes before its start (`PRE_EVENT_GRACE_MS`)
   until its end;
3. a position within the check-in radius of the venue: 300 m by default, set
   with `CHECKIN_RADIUS_METERS` on the API (50–5000). The phone's reported
   accuracy is allowed for, up to the radius itself.

A refusal is a 403 with a reason (`no_ticket`, `not_live`,
`no_venue_location`, `too_far`). The position is compared and never stored.
There is one open session per guest and event; a parallel check-in returns the
session that won.

## The Matches deck

- Shows the other guests checked in at the same event, filtered by the
  caller's gender choice and age range (`SwipeDeckService`, Postgres function
  `get_swipe_deck`). It is paged: 25 profiles per page by default, with a cursor.
- **Visibility** (`guest-safety/guest-visibility.ts`): `everyone` (every guest
  going), `liked` (only guests you liked at that event) or `hidden` (nobody;
  Matches is paused for you). A block hides two guests from each other
  whatever their settings.
- **Like limit** (`common/like-limit.ts`): 20% of the eligible guests, at
  least 3, never more than the eligible count, and never below the likes
  already used. The swipe is recorded atomically with the limit by the
  Postgres function `submit_guest_swipe_with_limit` (`MatchesService`). Self
  swipes and swipes by guests who aren't checked in at the event are refused.
- **A match** is a like returned by the same guest at the same event. Match
  rows are canonicalized and a duplicate created at the same moment is
  recovered from. Read the `tulum-matching-reliability` skill before changing
  any of this.

## Chat

- A match opens a chat that lasts **6 hours** from the match
  (`apps/mobile/components/inbox/inbox-model.ts`). The inbox shows the time left
  as a ring.
- Opening a chat checks the guest's position against the venue as Matches does
  (`LocationGateScreen`, 300 m).
- Messages go over the socket (`ChatsGateway`), which checks chat membership
  for every event, and the inbox gets pushed updates.

## After the event

- Admins archive the matches of events that have ended
  (`DELETE /cleanup/expired-matches`, `GET` previews it; not scheduled).
  Archived matches (`archived_at`) leave the inboxes but stay in the database,
  for the native apps and for reports (`CleanupService`).
- Past events **without matches** are deleted after every scrape run and by
  the admin route `DELETE /events/cleanup` (`CleanupService.deleteOldEvents`),
  with their tickets, swipes and sessions (the foreign keys cascade). A past
  event with a match, archived or not, is kept, so its matches, chats and
  messages stay too (decided 18 November 2026).

## Safety and privacy

- Guests report or block each other from a profile or a chat; reporting also
  blocks. Admins review reports in the dashboard (`/reports`); see the
  [moderation runbook](moderation-runbook.md).
- **Consent log.** The launch email opt-in is stored with the wording,
  language and platform it was given in (`retention/consents`).
- **Account deletion** is in the app (profile settings) and on the site
  (`/delete-account`). It is refused while the account owns venues
  (`AccountOwnsVenuesError`). Deleting the Clerk user ends the session; the
  delete-user webhook removes the user's data.

## Not built yet

- **Premium** (paid features). The pricing section is off the landing page
  until it exists (`components/sections/pricing-guest.tsx` is kept for it).
- **Native app availability** (launch batch B8, January).
