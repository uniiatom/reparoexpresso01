import { getServiceClient } from './supabase.ts';

export async function invokeInternalFunction(
  name: string,
  body: Record<string, unknown>,
) {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;

  try {
    const res = await fetch(`${url}/functions/v1/${name}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch {
    return null;
  }
}

export function isServiceRoleRequest(req: Request): boolean {
  const auth = req.headers.get('Authorization');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  return Boolean(key && auth === `Bearer ${key}`);
}

export function isCronRequest(req: Request): boolean {
  const secret = Deno.env.get('CRON_SECRET');
  if (!secret) return isServiceRoleRequest(req);
  return req.headers.get('x-cron-secret') === secret || isServiceRoleRequest(req);
}

export { getServiceClient };
