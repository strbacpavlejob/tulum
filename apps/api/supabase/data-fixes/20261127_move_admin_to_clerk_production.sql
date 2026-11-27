-- One-off data fix, applied by hand (not a migration): make the owner's
-- Clerk production account the admin and the host of every venue, as their
-- development account is now. It deletes nothing and adds no rows.
-- Project: tulum-demo (zebnwuzwezfzinvletji). Written 2026-11-27; rewritten
-- the same day for the state below, and so that nothing is deleted.
--
-- Why: development and production Clerk share this database. The owner's
-- development account (user_3AhXJK1JsvTgUakE05Bs5MSHd2E) is the admin and
-- DEFAULT_VENUE_HOST_ID, the host of every venue. Their production account
-- (user_3MhE3w0nGhkZJYwlFH65NX4f4fH) signed up with the same email. To free
-- the unique email, the development row's email was changed by hand to
-- strbacpavlejob@gmail.comm; Clerk's create-user webhook then made the
-- production row (username strbacpavlejob_x4f4fh, since strbacpavlejob was
-- taken) and its hosts row, and onboarding made its guest profile. State
-- read-only on 2026-11-27: production row not admin, no venues; development
-- row admin with all 663 venues.
--
-- Every place the development id appears, found read-only on 2026-11-27 by
-- scanning every text, array and JSON column in public:
--   venues.host_id         663 rows (every venue; events point at venues, so
--                          the 334 events follow without being touched)
--   users, hosts, guests,  1 row each: the development account itself
--   settings
--   event_engagements 13, venue_suggestions 3, marketing_consents 2, bugs 1:
--                          the development account's own guest activity
--   venues.picture_url     8 rows, only inside the R2 path of the picture
--                          (venues/<id>/...). Left alone: the objects stay
--                          where they are, and account deletion removes only
--                          guests/<id>/.
-- No triggers on users, hosts, venues, events or guests.
--
-- What it does, in one transaction, with UPDATEs only:
--   1. The development row keeps its id, data and admin flag. Its username
--      gets "_dev" and its email becomes a placeholder that can't receive
--      mail (gmail.comm is a domain anyone could register).
--   2. The production row becomes an admin and takes the plain username.
--   3. venues.host_id moves from the development to the production account.
--   Nothing else moves: the development account keeps its guest profile,
--   settings and activity, and the production account keeps the guest
--   profile it made in onboarding.
-- Checks: the rows must be in the state above before anything changes,
-- every venue must move, and every table in public is counted before and
-- after; if any table has a different number of rows, it raises an error
-- and the transaction rolls back. Run twice, the second run stops at the
-- first check and changes nothing.
--
-- After it: set DEFAULT_VENUE_HOST_ID to user_3MhE3w0nGhkZJYwlFH65NX4f4fH on
-- Railway (tulum-api) and in apps/api/.env, or newly imported venues keep
-- going to the development account. The development account stays usable
-- for local work (still an admin, no venues).

begin;

do $$
declare
  old_id constant text := 'user_3AhXJK1JsvTgUakE05Bs5MSHd2E';
  new_id constant text := 'user_3MhE3w0nGhkZJYwlFH65NX4f4fH';
  owner_email constant text := 'strbacpavlejob@gmail.com';
  owner_username constant text := 'strbacpavlejob';
  old_user users%rowtype;
  new_user users%rowtype;
  venues_to_move bigint;
  venues_moved bigint;
  tbl text;
  n_rows bigint;
  counts_before jsonb := '{}';
  counts_after jsonb := '{}';
begin
  select * into old_user from users where id = old_id;
  if not found then
    raise exception 'no users row for %', old_id;
  end if;
  select * into new_user from users where id = new_id;
  if not found then
    raise exception 'no users row for %: sign in to the production app first',
      new_id;
  end if;
  select count(*) into venues_to_move from venues where host_id = old_id;

  -- Already done.
  if venues_to_move = 0 and new_user.is_admin then
    raise exception 'nothing to do: % is an admin and % hosts no venues',
      new_id, old_id;
  end if;

  -- The rows must be in the state this was written for.
  if new_user.email <> owner_email then
    raise exception 'users row % has email %, not %',
      new_id, new_user.email, owner_email;
  end if;
  if old_user.email = owner_email then
    raise exception 'users row % still has %', old_id, owner_email;
  end if;
  if not old_user.is_admin then
    raise exception 'users row % is not an admin', old_id;
  end if;
  if not exists (select 1 from hosts where user_id = new_id) then
    raise exception 'no hosts row for %', new_id;
  end if;
  if exists (select 1 from users
              where username = owner_username || '_dev' and id <> old_id) then
    raise exception 'username %_dev is taken', owner_username;
  end if;
  if exists (select 1 from users
              where username = owner_username and id not in (old_id, new_id))
  then
    raise exception 'username % belongs to another account', owner_username;
  end if;

  for tbl in
    select tablename from pg_tables where schemaname = 'public' order by 1
  loop
    execute format('select count(*) from public.%I', tbl) into n_rows;
    counts_before := counts_before || jsonb_build_object(tbl, n_rows);
  end loop;

  -- 1. The development row: a placeholder email and the "_dev" username,
  --    which frees the plain username for the production row.
  update users
     set email = 'dev-' || old_id || '@invalid.tulum-app.com',
         username = owner_username || '_dev',
         updated_at = now()
   where id = old_id;

  -- 2. The production row: admin, with the plain username.
  update users
     set is_admin = true,
         username = owner_username,
         updated_at = now()
   where id = new_id;

  -- 3. Every venue gets the production account as its host.
  update venues set host_id = new_id where host_id = old_id;
  get diagnostics venues_moved = row_count;
  if venues_moved <> venues_to_move
     or exists (select 1 from venues where host_id = old_id) then
    raise exception 'moved % venues, expected %', venues_moved, venues_to_move;
  end if;

  -- Nothing deleted or added: every table has as many rows as before.
  for tbl in
    select tablename from pg_tables where schemaname = 'public' order by 1
  loop
    execute format('select count(*) from public.%I', tbl) into n_rows;
    counts_after := counts_after || jsonb_build_object(tbl, n_rows);
    if n_rows <> coalesce((counts_before ->> tbl)::bigint, 0) then
      raise exception 'table % changed size: % rows before, % after',
        tbl, counts_before ->> tbl, n_rows;
    end if;
  end loop;

  raise notice 'moved % venues to %', venues_moved, new_id;
  raise notice 'row counts (unchanged): %', counts_after;
end $$;

-- The result to expect: the production account with the owner's email,
-- username strbacpavlejob, is_admin true, 663 venues and their 334 events;
-- the development account still there, with the placeholder email,
-- strbacpavlejob_dev, is_admin true and no venues. If the block above
-- raised an error, this fails too and nothing is changed.
select u.id, u.email, u.username, u.is_admin,
       (select count(*) from venues v where v.host_id = u.id) as venues,
       (select count(*) from events e join venues v on v.id = e.venue_id
         where v.host_id = u.id) as events_at_its_venues
  from users u
 where u.id in ('user_3MhE3w0nGhkZJYwlFH65NX4f4fH',
                'user_3AhXJK1JsvTgUakE05Bs5MSHd2E')
 order by u.created_at desc;

commit;
