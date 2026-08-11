/**
 * Variáveis do Supabase no Vite (build-time).
 * Lidas do .env local ou das Environment variables do Netlify no build.
 */
export function getSupabaseEnv() {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID?.trim() || '';
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
    || (projectId ? `https://${projectId}.supabase.co` : '');
  const key = (
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
    || import.meta.env.VITE_SUPABASE_ANON_KEY
  )?.trim() || '';

  return { url, key, projectId };
}

export function isSupabaseConfigured() {
  const { url, key } = getSupabaseEnv();
  return Boolean(url && key);
}
