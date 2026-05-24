import { supabase } from '@/lib/supabase/client';
import { mapSessionUser } from '@/lib/auth/mapSessionUser';

async function loadProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Substitui base44.auth — sessão via Supabase Auth. */
export function createSupabaseAuthAdapter() {
  return {
    async me() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        throw new Error('Usuário não autenticado.');
      }
      const profile = await loadProfile(user.id);
      return mapSessionUser(user, profile);
    },

    async logout() {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  };
}
