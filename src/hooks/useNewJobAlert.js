import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

// Gera som de buzina de carro usando Web Audio API
export function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    const playHorn = (startTime, duration) => {
      // Oscilador principal — onda sawtooth grave simula buzina
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.value = 130; // grave de caminhão
      osc2.type = 'sawtooth';
      osc2.frequency.value = 165; // harmônico grave

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
      gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + startTime + 0.02);
      gain.gain.setValueAtTime(0.4, ctx.currentTime + startTime + duration - 0.04);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + startTime + duration);

      osc1.start(ctx.currentTime + startTime);
      osc1.stop(ctx.currentTime + startTime + duration);
      osc2.start(ctx.currentTime + startTime);
      osc2.stop(ctx.currentTime + startTime + duration);
    };

    // Buzina longa de caminhão
    playHorn(0.0, 1.8);
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