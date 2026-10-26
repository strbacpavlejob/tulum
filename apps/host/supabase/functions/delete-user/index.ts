// Clerk webhook for `user.deleted`, the counterpart of create-user: it removes
// everything in the database that belongs to the deleted user. It runs for
// every deletion, both in the app (DELETE /users/me on the API, which also
// removes the user's photos from R2 before it deletes the Clerk user) and in
// the Clerk dashboard.
//
// Deploy with `supabase functions deploy delete-user --no-verify-jwt`. Clerk
// sends no Supabase JWT; the function checks Clerk's webhook signature
// instead, so set the endpoint's signing secret from the Clerk dashboard:
// `supabase secrets set CLERK_DELETE_USER_SIGNING_SECRET=whsec_...`. Every
// Clerk endpoint has its own secret and every function sees all the
// project's secrets, hence a name for this endpoint only.

import '@supabase/functions-js/edge-runtime.d.ts';
import { verifyWebhook } from 'npm:@clerk/backend@3.4.13/webhooks';
import {
  createClient,
  type SupabaseClient,
} from 'npm:@supabase/supabase-js@2.105.3';

// Everything that belongs to a user, children before parents, so no step
// relies on a cascade. Deleting a match also deletes its chat and every
// message in it, the other guest's too (ON DELETE CASCADE); the user's own
// messages go first. guest_reports, bugs and venue_suggestions keep their
// rows: their user columns are ON DELETE SET NULL, so deleting the users row
// only unlinks them, and reports stay for moderation.
const STEPS: ReadonlyArray<readonly [table: string, column: string]> = [
  ['chat_messages', 'sender_id'],
  ['matches', 'guest_id_1'],
  ['matches', 'guest_id_2'],
  ['guest_swipes', 'swiper_user_id'],
  ['guest_swipes', 'swiped_user_id'],
  ['event_sessions', 'user_id'],
  ['tickets', 'guest_id'],
  ['event_engagements', 'user_id'],
  ['guest_blocks', 'blocker_id'],
  ['guest_blocks', 'blocked_id'],
  // settings.user_id has no ON DELETE action, so the row must go before users.
  ['settings', 'user_id'],
  ['guests', 'user_id'],
  ['hosts', 'user_id'],
  ['users', 'id'],
];

/** The user hosts venues, which can't be deleted along with the account. */
class OwnsVenuesError extends Error {
  venues: number;

  constructor(venues: number) {
    super(`The user hosts ${venues} venue(s)`);
    this.venues = venues;
  }
}

/**
 * Deletes the user's rows, table by table, and returns how many went from
 * each. Every step is idempotent: when one fails, Clerk retries the webhook
 * and the retry finishes the job.
 */
async function deleteUserData(
  supabase: SupabaseClient,
  userId: string,
): Promise<Record<string, number>> {
  // venues.host_id is NOT NULL with no ON DELETE action, and deleting the
  // venues would take their events with them, with other guests' tickets,
  // matches and chats. Such an account needs its venues moved first, so
  // nothing is deleted.
  const venues = await supabase
    .from('venues')
    .select('id', { count: 'exact', head: true })
    .eq('host_id', userId);
  if (venues.error) throw new Error(`venues: ${venues.error.message}`);
  if (venues.count) throw new OwnsVenuesError(venues.count);

  const removed: Record<string, number> = {};
  for (const [table, column] of STEPS) {
    const { error, count } = await supabase
      .from(table)
      .delete({ count: 'exact' })
      .eq(column, userId);
    if (error) throw new Error(`${table}.${column}: ${error.message}`);
    removed[table] = (removed[table] ?? 0) + (count ?? 0);
  }
  return removed;
}

/**
 * The key that bypasses RLS. This project has the legacy JWT keys turned
 * off, so it comes from SUPABASE_SECRET_KEYS (the project's secret keys by
 * name); SUPABASE_SERVICE_ROLE_KEY is the legacy key.
 */
function secretKey(): string | undefined {
  try {
    const key = JSON.parse(
      Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}',
    ).default;
    if (typeof key === 'string' && key) return key;
  } catch {
    // Not JSON: fall back to the legacy key.
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const signingSecret = Deno.env.get('CLERK_DELETE_USER_SIGNING_SECRET');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = secretKey();
  if (!signingSecret || !supabaseUrl || !supabaseKey) {
    console.error(
      'delete-user: CLERK_DELETE_USER_SIGNING_SECRET, SUPABASE_URL or the secret key is not set',
    );
    return json({ error: 'The function is not configured' }, 500);
  }

  let event: Awaited<ReturnType<typeof verifyWebhook>>;
  try {
    // Checks the svix-* headers against the body, so only Clerk can delete.
    event = await verifyWebhook(req, { signingSecret });
  } catch (err) {
    console.warn(
      'delete-user: webhook verification failed:',
      errorMessage(err),
    );
    return json({ error: 'Webhook verification failed' }, 400);
  }

  if (event.type !== 'user.deleted') {
    // Acknowledged so that Clerk doesn't retry it.
    return json({ ignored: event.type });
  }

  const userId = event.data.id;
  if (!userId) {
    return json({ error: 'user.deleted event without a user id' }, 400);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const removed = await deleteUserData(supabase, userId);
    console.log(`delete-user: deleted ${userId}`, JSON.stringify(removed));
    return json({ user_id: userId, removed });
  } catch (err) {
    if (err instanceof OwnsVenuesError) {
      // Clerk keeps retrying for a while; once the venues have another host,
      // a retry (or Resend in the Clerk dashboard) deletes the rest.
      console.error(`delete-user: ${userId} not deleted: ${err.message}`);
      return json({ error: err.message, venues: err.venues }, 409);
    }
    console.error(`delete-user: deleting ${userId} failed:`, errorMessage(err));
    return json({ error: 'Deleting the user data failed' }, 500);
  }
});
