import { createAllEntityAdapters } from '@/lib/repositories/entityRegistry';
import { createSupabaseAuthAdapter } from '@/lib/supabaseAuthAdapter';
import { createSupabaseIntegrations } from '@/lib/supabaseStorage';
import { invokeFunction } from '@/lib/supabaseFunctions';

/**
 * Cliente de API do frontend — 100% Supabase.
 * O export `base44` mantém compatibilidade com imports legados; nenhuma chamada vai à Base44.
 */
export const base44 = {
  entities: createAllEntityAdapters(),
  auth: createSupabaseAuthAdapter(),
  integrations: createSupabaseIntegrations(),
  functions: {
    invoke: invokeFunction,
  },
};

/** Alias preferencial para código novo. */
export const api = base44;
