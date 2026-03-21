import { useEffect, useRef, useCallback } from 'react';

// Gera um beep de alerta usando Web Audio API
function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const playBeep = (freq, start, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.4, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };
    // Padrão: 3 bipes ascendentes
    playBeep(660, 0, 0.18);
    playBeep(880, 0.22, 0.18);
    playBeep(1100, 0.44, 0.3);
  } catch (e) {
    console.warn('Áudio não disponível:', e);
  }
}

/**
 * Hook que monitora novos chamados em tempo real via subscribe.
 * Dispara som e chama onNewJob(request) quando chega um novo pedido.
 */
export function useNewJobAlert({ enabled, onNewJob }) {
  const knownIds = useRef(new Set());
  const enabledRef = useRef(enabled);

  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = base44Sub();
    return unsubscribe;
  }, [enabled]);

  // Separado para poder recriar sem re-importar
  function base44Sub() {
    // Importamos dinamicamente para não quebrar em ambientes sem o módulo
    const { base44 } = require('@/api/base44Client') || {};
    if (!base44) return () => {};

    const unsub = base44.entities.ServiceRequest.subscribe((event) => {
      if (!enabledRef.current) return;
      if (event.type === 'create' && event.data?.status === 'aguardando') {
        if (!knownIds.current.has(event.id)) {
          knownIds.current.add(event.id);
          playAlertSound();
          onNewJob?.(event.data);
        }
      }
    });

    return unsub;
  }
}

export { playAlertSound };