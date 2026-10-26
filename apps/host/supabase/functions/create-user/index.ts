// Clerk webhook for `user.created`: makes the users and hosts rows that the
// API and the apps expect for every Clerk user. delete-user removes them.
//
// Deploy with `supabase functions deploy create-user --no-verify-jwt`. Clerk
// sends no Supabase JWT; the function checks Clerk's webhook signature
// instead, so set the endpoint's signing secret from the Clerk dashboard:
// `supabase secrets set CLERK_CREATE_USER_SIGNING_SECRET=whsec_...`. Every
// Clerk endpoint has its own secret and every function sees all the
// project's secrets, hence a name for this endpoint only. Set it before
// deploying: without it every sign-up gets a 500 until it is set.

import '@supabase/functions-js/edge-runtime.d.ts';
import { verifyWebhook } from 'npm:@clerk/backend@3.4.13/webhooks';
import {
  createClient,
  type PostgrestError,
  type SupabaseClient,
} from 'npm:@supabase/supabase-js@2.105.3';

type UserRow = {
  id: string;
  email: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
};

/** Another users row has the email, so this one can't be created yet. */
class EmailTakenError extends Error {}

function isUniqueViolation(error: PostgrestError, constraint: string) {
  return error.code === '23505' && error.message.includes(constraint);
}

/** The primary email address, or the first one. */
function primaryEmail(user: {
  primary_email_address_id: string | null;
  email_addresses: { id: string; email_address: string }[];
}): string | undefined {
  const emails = user.email_addresses ?? [];
  const primary = emails.find((e) => e.id === user.primary_email_address_id);
  return (primary ?? emails[0])?.email_address;
}

/**
 * Inserts the users row unless one with this id exists, and returns whether
 * it did. Clerk retries deliveries, and a repeated user.created must neither
 * fail nor overwrite what the app changed since (onboarding saves
 * first_name).
 */
async function insertUser(
  supabase: SupabaseClient,
  row: UserRow,
): Promise<boolean> {
  const insert = (values: UserRow) =>
    supabase
      .from('users')
      .upsert(values, { onConflict: 'id', ignoreDuplicates: true })
      .select('id');

  let { data, error } = await insert(row);
  if (error && isUniqueViolation(error, 'users_username_key')) {
    // Clerk usernames are unique, so the other row is a seeded user or an
    // account whose deletion hasn't been processed yet. A suffix from the
    // (unique) Clerk id keeps this account usable.
    ({ data, error } = await insert({
      ...row,
      username: `${row.username}_${row.id.slice(-6).toLowerCase()}`,
    }));
  }
  if (error && isUniqueViolation(error, 'users_email_key')) {
    // Clerk emails are unique too, so the other row is stale, most likely an
    // account deleted in Clerk that delete-user hasn't removed yet. Clerk
    // retries, and a retry succeeds once it has.
    throw new EmailTakenError('Another users row has this email');
  }
  if (error) throw new Error(`users: ${error.message}`);
  return (data ?? []).length > 0;
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

  const signingSecret = Deno.env.get('CLERK_CREATE_USER_SIGNING_SECRET');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = secretKey();
  if (!signingSecret || !supabaseUrl || !supabaseKey) {
    console.error(
      'create-user: CLERK_CREATE_USER_SIGNING_SECRET, SUPABASE_URL or the secret key is not set',
    );
    return json({ error: 'The function is not configured' }, 500);
  }

  let event: Awaited<ReturnType<typeof verifyWebhook>>;
  try {
    // Checks the svix-* headers against the body, so only Clerk can create.
    event = await verifyWebhook(req, { signingSecret });
  } catch (err) {
    console.warn(
      'create-user: webhook verification failed:',
      errorMessage(err),
    );
    return json({ error: 'Webhook verification failed' }, 400);
  }

  if (event.type !== 'user.created') {
    // Acknowledged so that Clerk doesn't retry it.
    return json({ ignored: event.type });
  }

  const user = event.data;
  const email = primaryEmail(user);
  if (!user.id || !email) {
    // users.email is NOT NULL. Clerk asks for an email at sign-up, so this is
    // a user made another way, e.g. in the dashboard without one.
    console.error(`create-user: ${user.id} has no email address`);
    return json({ error: 'user.created event without an email address' }, 422);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const created = await insertUser(supabase, {
      id: user.id,
      email,
      username: user.username ?? email.split('@')[0],
      first_name: user.first_name,
      last_name: user.last_name,
      avatar_url: user.image_url,
    });

    // Also runs when the users row already existed, so a delivery that
    // failed between the two inserts is completed by Clerk's retry.
    const hosts = await supabase
      .from('hosts')
      .upsert(
        { user_id: user.id },
        { onConflict: 'user_id', ignoreDuplicates: true },
      );
    if (hosts.error) throw new Error(`hosts: ${hosts.error.message}`);

    console.log(
      `create-user: ${created ? 'created' : 'already had'} ${user.id}`,
    );
    return json({ user_id: user.id, created }, created ? 201 : 200);
  } catch (err) {
    if (err instanceof EmailTakenError) {
      console.error(`create-user: ${user.id} not created: ${err.message}`);
      return json({ error: err.message }, 409);
    }
    console.error(
      `create-user: creating ${user.id} failed:`,
      errorMessage(err),
    );
    return json({ error: 'Creating the user failed' }, 500);
  }
});
