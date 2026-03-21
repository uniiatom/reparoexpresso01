import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

// Gera som de alerta usando Web Audio API (3 bipes ascendentes)
export function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const playBeep = (freq, start, dur) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.5, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur);
    };
    playBeep(660, 0.0, 0.18);
    playBeep(880, 0.22, 0.18);
    playBeep(1100, 0.44, 0.30);
  } catch (e) {
    console.warn('Web Audio não disponível:', e);
  }
}

/**
 * Monitora novos chamados via subscribe em tempo real.
 * Quando enabled=true e chega um ServiceRequest com status='aguardando',
 * dispara o som de alerta e chama onNewJob(requestData).
 */
export function useNewJobAlert({ enabled, onNewJob }) {
  const enabledRef = useRef(enabled);
  const seenIds = useRef(new Set());
  const onNewJobRef = useRef(onNewJob);

  useEffect(() => { enabledRef.current = enabled; }, [enabled]);
  useEffect(() => { onNewJobRef.current = onNewJob; }, [onNewJob]);

  useEffect(() => {
    const unsubscribe = base44.entities.ServiceRequest.subscribe((event) => {
      if (!enabledRef.current) return;
      if (event.type === 'create' && event.data?.status === 'aguardando') {
        if (!seenIds.current.has(event.id)) {
          seenIds.current.add(event.id);
          playAlertSound();
          onNewJobRef.current?.(event.data);
        }
      }
    });

    return unsubscribe;
  }, []);
}