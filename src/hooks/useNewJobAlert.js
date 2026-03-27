import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

// Toca uma buzina de caminhão (grave, potente) e retorna função para parar
export function startHornLoop() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    let stopped = false;
    let intervalId = null;

    const playTruckHorn = () => {
      if (stopped) return;

      const now = ctx.currentTime;

      // Frequências graves de buzina de caminhão (~100-150 Hz)
      const frequencies = [100, 120, 135];
      const masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);
      // Volume ALTO para garantir que oiça
      masterGain.gain.setValueAtTime(0, now);
      masterGain.gain.linearRampToValueAtTime(0.9, now + 0.1);   // ataque rápido
      masterGain.gain.setValueAtTime(0.9, now + 1.8);             // sustain longo
      masterGain.gain.linearRampToValueAtTime(0, now + 2.0);      // decay rápido

      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();

        osc.type = 'square'; // Square é mais "buzzy" que sawtooth
        osc.frequency.setValueAtTime(freq, now);
        // Vibrato mais pronunciado para soar como caminhão
        osc.frequency.linearRampToValueAtTime(freq * 0.98, now + 0.3);
        osc.frequency.linearRampToValueAtTime(freq * 1.02, now + 0.6);
        osc.frequency.linearRampToValueAtTime(freq, now + 1.8);

        oscGain.gain.value = i === 0 ? 0.6 : 0.3;
        osc.connect(oscGain);
        oscGain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 2.0);
      });
    };

    // Toca imediatamente e repete a cada 2.5s
    playTruckHorn();
    intervalId = setInterval(playTruckHorn, 2500);

    return () => {
      stopped = true;
      clearInterval(intervalId);
      try {
        ctx.close();
      } catch (e) {
        console.warn('Erro ao fechar contexto de áudio:', e);
      }
    };
  } catch (e) {
    console.error('Erro ao tocar buzina:', e);
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

  // Expõe funções globais para parar a buzina e limpar IDs vistos
  useEffect(() => {
    window.__stopProviderHorn = () => {
      stopHornRef.current?.();
      stopHornRef.current = null;
    };
    window.__clearSeenJobIds = () => {
      seenIds.current.clear();
    };
    return () => { 
      delete window.__stopProviderHorn;
      delete window.__clearSeenJobIds;
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      // Se desabilitado, para qualquer buzina tocando
      stopHornRef.current?.();
      stopHornRef.current = null;
      return;
    }

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
  }, [enabled]);
}