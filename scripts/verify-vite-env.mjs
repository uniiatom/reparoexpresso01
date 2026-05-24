import { loadDotEnv, loadViteEnvFromDotenv, resolveSupabaseFromEnv } from './load-env.mjs';

const fileEnv = loadDotEnv('.env');
const merged = { ...fileEnv, ...process.env };
const { url, key } = resolveSupabaseFromEnv(merged);

if (!url?.trim() || !key?.trim()) {
  console.error('\n❌ Build cancelado: variáveis do Supabase ausentes.\n');
  console.error('Confira o arquivo .env (ou Environment variables no Netlify):');
  console.error('  VITE_SUPABASE_URL');
  console.error('  VITE_SUPABASE_PUBLISHABLE_KEY');
  console.error('  (alternativa: VITE_SUPABASE_PROJECT_ID + chave anon)\n');
  console.error('Netlify: pnpm netlify:env  →  depois Trigger deploy\n');
  process.exit(1);
}

const viteCount = Object.keys(loadViteEnvFromDotenv('.env')).length;
console.log(`[build] Supabase OK · ${viteCount} variável(is) VITE_ no .env local`);
