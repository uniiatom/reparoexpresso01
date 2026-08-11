import { existsSync, readFileSync } from 'node:fs';

/** Carrega .env local (suporta valores entre aspas). */
export function loadDotEnv(path = '.env') {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const name = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[name] = value;
  }
  return out;
}

/** Apenas variáveis públicas do Vite (seguras para o bundle do navegador). */
export function loadViteEnvFromDotenv(path = '.env') {
  const raw = loadDotEnv(path);
  return Object.fromEntries(
    Object.entries(raw).filter(([key]) => key.startsWith('VITE_')),
  );
}

export function resolveSupabaseFromEnv(env = {}) {
  const projectId = env.VITE_SUPABASE_PROJECT_ID?.trim() || '';
  const url = env.VITE_SUPABASE_URL?.trim()
    || (projectId ? `https://${projectId}.supabase.co` : '');
  const key = (
    env.VITE_SUPABASE_PUBLISHABLE_KEY
    || env.VITE_SUPABASE_ANON_KEY
  )?.trim() || '';

  return { url, key, projectId };
}

export function getRequiredViteEnvKeys() {
  return [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    'VITE_SUPABASE_PROJECT_ID',
  ];
}

export function validateViteEnv(env = {}) {
  const { url, key } = resolveSupabaseFromEnv(env);
  const missing = [];

  if (!url) missing.push('VITE_SUPABASE_URL (ou VITE_SUPABASE_PROJECT_ID)');
  if (!key) missing.push('VITE_SUPABASE_PUBLISHABLE_KEY');

  return { ok: missing.length === 0, missing, supabase: { url, key } };
}
