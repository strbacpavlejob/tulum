//@ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@1.30.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { id, email_addresses, username, first_name, last_name,image_url } = (await req.json()).data;
    const email = email_addresses[0].email_address;

    const { data, error } = await supabase
      .from('users')
      .insert({ id, username: username ?? email.split('@')[0], email, avatar_url: image_url, first_name, last_name })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify(error), { status: 400 });
    }

    const { error: hostError } = await supabase
      .from('hosts')
      .insert({ user_id: id });

    if (hostError) {
      return new Response(JSON.stringify(hostError), { status: 400 });
    }

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
      status: 201,
    });
  } catch (err) {
    console.log(err);

    return new Response(JSON.stringify({ error: err.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});