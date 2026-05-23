import '@/lib/disable-base44-analytics.js';
import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

/** Cliente legado Base44 (entidades/funções ainda em migração para Supabase). */
export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl,
});

/** Remove ?analytics-enable=false da barra de endereço após o SDK ler a config. */
if (typeof window !== 'undefined') {
  const url = new URL(window.location.href);
  if (url.searchParams.has('analytics-enable')) {
    url.searchParams.delete('analytics-enable');
    const qs = url.searchParams.toString();
    window.history.replaceState({}, '', `${url.pathname}${qs ? `?${qs}` : ''}${url.hash}`);
  }
}
