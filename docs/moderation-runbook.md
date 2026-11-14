# Moderation runbook

What the moderator on duty does with reports during a Tulum night such as
KST Maskenbal. Guests report each other from a profile or a chat (⋯ → Report).
A report also blocks the reported guest for the reporter at once, so the two
no longer see each other anywhere in the app. Everything below is for
everyone else's safety.

## Before the night

- [ ] The moderator signs in to the host dashboard with an account whose
      `users.is_admin` is true, and can open **Reports** in the sidebar.
- [ ] They can open the Supabase **SQL editor** for the production project,
      and the **Clerk dashboard** for the production instance (to ban).
- [ ] Migration `20261114204310_moderation_views.sql` is applied, so
      `moderation.report_queue` answers in the SQL editor.
- [ ] Run steps 2 to 6 once on staging with a test report, then undo them.
- [ ] Agree who to call: venue security on site, and who decides a ban.

## 1. Watch the queue

Every 10 to 15 minutes, and straight away when someone at the venue asks:

- Host dashboard → **Reports**, filter **Pending**. Urgent reasons are
  marked. Set a report to **In review** while you handle it.
- Or in the SQL editor, most urgent first:

```sql
SELECT priority, created_at, reason, reported_name, reported_open_reports,
       reported_visibility, event_title, details, reported_user_id
FROM moderation.report_queue;
```

`priority` 1 is underage or an unsafe meeting, 2 harassment, 3 the rest.
A report from a chat has the chat's last messages in `messages`.
`moderation.reported_guests` shows each reported guest once, with how many
different guests reported them.

## 2. Decide

| Report | Do |
| --- | --- |
| **Underage** (Tulum is 18+) | Hide (3) and end their night (4) at once. Ban (5) once it's clear. |
| **Unsafe meeting**, threats | Hide (3) and end their night (4) at once, and tell venue security if the guest may be inside. Ban (5) if it's credible. |
| **Harassment** | Read the messages. Hide (3) on a credible report. Ban (5) for threats or a second report. |
| **Fake profile, spam, inappropriate, other** | Hide (3) if it's clear. Ban (5) spam accounts. Otherwise mark it rejected. |

Sexual content involving a minor: don't download, copy or forward it. Ban
(5), keep the report as it is, and report it to the police.

## 3. Hide a guest

They leave every swipe deck and guest list, and Matches stops for them. Their
existing matches and chats stay.

```sql
UPDATE public.guests SET visibility = 'hidden'
WHERE user_id = '<reported_user_id>';
```

## 4. End their night at the event

Takes them out of "people here now" for every event they're checked in to.

```sql
UPDATE public.event_sessions SET exited_at = now()
WHERE user_id = '<reported_user_id>' AND exited_at IS NULL;
```

## 5. Ban an account

Clerk dashboard → **Users** → search for the user id or email → **⋯** →
**Ban user**. This signs them out on every device and stops them signing in
again. Their requests to the API stop within about a minute, when their
session token runs out. Do it as well as 3, which keeps them out of other
guests' screens while it takes effect.

## 6. Close the report

In **Reports**, set the status to **Resolved** (you acted) or **Rejected**
(nothing to do). Note what you did and when in the team's shared log, with
the report's time and reason, not the guests' names.

## Undo

```sql
UPDATE public.guests SET visibility = 'everyone'
WHERE user_id = '<user_id>';
```

Unban in Clerk: the user → **⋯** → **Unban user**. An ended check-in can't be
restored; the guest checks in again from the app.

## Don'ts

- Don't delete accounts, reports, matches or messages: they're the record of
  what happened. The admin clean-up only archives matches.
- Don't contact guests from a personal account, and don't share screenshots
  of reports or chats.
- Don't run anything else in the SQL editor during the night.

## Finding a guest

```sql
SELECT id, email, first_name, last_name, created_at
FROM public.users
WHERE email ILIKE '%<part of the email>%' OR first_name ILIKE '<name>%'
LIMIT 20;
```
