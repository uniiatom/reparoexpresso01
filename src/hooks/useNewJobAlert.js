import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

// Toca uma buzina de caminhão e retorna função para parar
export function startHornLoop() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    let stopped = false;
    let intervalId = null;

    const playHorn = () => {
      if (stopped) return;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.value = 130;
      osc2.type = 'sawtooth';
      osc2.frequency.value = 165;

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.6, now + 0.05);
      gain.gain.setValueAtTime(0.6, now + 1.7);
      gain.gain.linearRampToValueAtTime(0, now + 1.8);

      osc1.start(now);
      osc1.stop(now + 1.8);
      osc2.start(now);
      osc2.stop(now + 1.8);
    };

    // Toca imediatamente e repete a cada 2.2s
    playHorn();
    intervalId = setInterval(playHorn, 2200);

    return () => {
      stopped = true;
      clearInterval(intervalId);
      ctx.close();
    };
  } catch (e) {
    console.warn('Web Audio não disponível:', e);
    return () => {};
  }
}

/**
 * Monitora novos chamados via subscribe em tempo real.
 * Quando enabled=true e chega um ServiceRequest com status='aguardando',
 * dispara a buzina em loop e chama onNewJob(requestData).
 * A buzina para quando onStopHorn é chamado (ao aceitar/recusar).
 */
export function useNewJobAlert({ enabled, onNewJob }) {
  const enabledRef = useRef(enabled);
  const seenIds = useRef(new Set());
  const onNewJobRef = useRef(onNewJob);
  const stopHornRef = useRef(null);

  useEffect(() => { enabledRef.current = enabled; }, [enabled]);
  useEffect(() => { onNewJobRef.current = onNewJob; }, [onNewJob]);

  // Expõe função global para parar a buzina
  useEffect(() => {
    window.__stopProviderHorn = () => {
      stopHornRef.current?.();
      stopHornRef.current = null;
    };
    return () => { delete window.__stopProviderHorn; };
  }, []);

  useEffect(() => {
    const unsubscribe = base44.entities.ServiceRequest.subscribe((event) => {
      if (!enabledRef.current) return;
      // Detecta novo chamado tanto por criação quanto por atualização para 'aguardando'
      const isNewJob = (event.type === 'create' || event.type === 'update') && event.data?.status === 'aguardando';
      if (isNewJob) {
        const eventKey = `${event.id}-${event.type}`;
        if (!seenIds.current.has(eventKey)) {
          seenIds.current.add(eventKey);
          // Toca buzina (reinicia se já tocando)
          stopHornRef.current?.();
          stopHornRef.current = startHornLoop();
          onNewJobRef.current?.(event.data);
        }
      }
    });

    return unsubscribe;
  }, []);
}