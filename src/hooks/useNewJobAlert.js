import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

// Toca uma buzina de navio (grave, longa, com vibrato) e retorna função para parar
export function startHornLoop() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    let stopped = false;
    let intervalId = null;

    const playShipHorn = () => {
      if (stopped) return;

      const now = ctx.currentTime;

      // Frequências graves típicas de buzina de navio (~80-110 Hz)
      const frequencies = [82, 98, 110];
      const oscillators = [];
      const masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);

      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);
        // Pequeno vibrato grave (efeito navio)
        osc.frequency.linearRampToValueAtTime(freq * 0.995, now + 0.3);
        osc.frequency.linearRampToValueAtTime(freq * 1.005, now + 0.8);
        osc.frequency.linearRampToValueAtTime(freq, now + 2.5);

        oscGain.gain.value = i === 0 ? 0.5 : 0.25;
        osc.connect(oscGain);
        oscGain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 3.2);
        oscillators.push(osc);
      });

      // Envelope: ataque lento, sustain longo, decay lento — característico de navio
      masterGain.gain.setValueAtTime(0, now);
      masterGain.gain.linearRampToValueAtTime(0.7, now + 0.4);   // ataque
      masterGain.gain.setValueAtTime(0.7, now + 2.6);             // sustain
      masterGain.gain.linearRampToValueAtTime(0, now + 3.2);      // fade out
    };

    // Toca imediatamente e repete a cada 4.5s (padrão de buzina de navio)
    playShipHorn();
    intervalId = setInterval(playShipHorn, 4500);

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
      // Serviços agendados NÃO disparam buzina — só aparecem na aba Agenda
      const isNewJob = (event.type === 'create' || event.type === 'update') && event.data?.status === 'aguardando' && event.data?.modality !== 'agendado';
      const isRemoved = event.type === 'update' && event.data?.status !== 'aguardando';

      if (isRemoved) {
        // Remove da lista de vistos para permitir re-enfileirar se voltar a aguardando
        seenIds.current.delete(event.id);
      }

      if (isNewJob) {
        // Rastreia apenas pelo ID do serviço para não duplicar o mesmo chamado
        if (!seenIds.current.has(event.id)) {
          seenIds.current.add(event.id);
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