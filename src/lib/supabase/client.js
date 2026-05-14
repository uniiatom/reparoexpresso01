import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.warn(
    '[supabase] Defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no .env para usar auth e dados.'
  );
}

/** Cliente browser (anon / publishable key). Só operações permitidas por RLS. */
export const supabase = createClient(url ?? '', key ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
