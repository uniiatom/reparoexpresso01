/**
 * Desliga telemetria Base44 antes do SDK carregar.
 * O estado fica em window.base44SharedInstances e sobrevive ao hot-reload —
 * por isso limpamos o cache e forçamos analytics-enable=false na URL.
 */
export function disableBase44Analytics() {
  if (typeof window === 'undefined') return;

  if (window.base44SharedInstances?.analytics) {
    delete window.base44SharedInstances.analytics;
  }

  const url = new URL(window.location.href);
  url.searchParams.set('analytics-enable', 'false');
  const qs = url.searchParams.toString();
  window.history.replaceState({}, '', `${url.pathname}${qs ? `?${qs}` : ''}${url.hash}`);
}

disableBase44Analytics();
