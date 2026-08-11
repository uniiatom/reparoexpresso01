import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

// Chave pública VAPID — deve ser configurada no .env e aqui como constante
// Para gerar: npx web-push generate-vapid-keys
// Substitua pelo valor real após configurar o secret VAPID_PUBLIC_KEY
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Registra o Service Worker e a Web Push subscription do prestador.
 * Salva a subscription no banco para que o backend possa enviar pushes.
 */
export function useProviderPush({ providerId, enabled }) {
  const registered = useRef(false);

  useEffect(() => {
    if (!enabled || !providerId || registered.current) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('[Push] Navegador não suporta Web Push');
      return;
    }
    if (!VAPID_PUBLIC_KEY) {
      console.warn('[Push] VITE_VAPID_PUBLIC_KEY não configurada');
      return;
    }

    async function registerPush() {
      try {
        // Registra o Service Worker
        const reg = await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
        await navigator.serviceWorker.ready;

        // Pede permissão de notificação
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.log('[Push] Permissão negada');
          return;
        }

        // Verifica se já tem subscription ativa
        let subscription = await reg.pushManager.getSubscription();

        if (!subscription) {
          subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          });
        }

        // Salva subscription no banco do prestador
        await base44.entities.Provider.update(providerId, {
          push_subscription: JSON.stringify(subscription),
        });

        registered.current = true;
        console.log('[Push] Subscription registrada com sucesso para prestador:', providerId);
      } catch (err) {
        console.error('[Push] Erro ao registrar subscription:', err);
      }
    }

    registerPush();
  }, [enabled, providerId]);
}