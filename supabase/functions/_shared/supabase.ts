import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

export function getServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
}

export function getUserClient(authHeader: string): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );
}

export async function requireUser(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return { error: json401('Unauthorized') };

  const supabaseUser = getUserClient(authHeader);
  const { data, error } = await supabaseUser.auth.getUser();
  if (error || !data.user) return { error: json401('Unauthorized') };

  const supabase = getServiceClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .maybeSingle();

  const user = {
    id: data.user.id,
    email: data.user.email ?? profile?.email,
    full_name:
      profile?.full_name ??
      data.user.user_metadata?.full_name ??
      (data.user.email ? data.user.email.split('@')[0] : ''),
    role: profile?.role ?? 'user',
  };

  return { user, supabase, supabaseUser };
}

export async function requireAdminOrService(req: Request) {
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authHeader = req.headers.get('Authorization');
  if (serviceKey && authHeader === `Bearer ${serviceKey}`) {
    return {
      user: {
        id: 'system',
        email: 'system@reparoexpresso.local',
        full_name: 'System',
        role: 'admin',
      },
      supabase: getServiceClient(),
    };
  }
  const auth = await requireUser(req);
  if ('error' in auth) return auth;
  if (auth.user.role !== 'admin') {
    return { error: json403('Forbidden: Admin access required') };
  }
  return auth;
}

function json403(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 403,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

function json401(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
