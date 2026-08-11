import { createClient } from '@supabase/supabase-js';
import { getSupabaseEnv, isSupabaseConfigured } from '@/lib/supabase/env';

const { url, key } = getSupabaseEnv();

export { isSupabaseConfigured };

if (!isSupabaseConfigured()) {
  console.error(
    '[supabase] VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY não foram definidas no build. '
    + 'No Netlify, cadastre em Environment variables e faça um novo deploy.',
  );
}

/** Cliente browser (anon / publishable key). Só operações permitidas por RLS. */
export const supabase = createClient(
  url || 'https://configuracao-pendente.supabase.co',
  key || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
