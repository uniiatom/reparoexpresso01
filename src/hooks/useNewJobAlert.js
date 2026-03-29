import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

// Toca uma buzina de caminhão (grave, potente) e retorna função para parar
export function startHornLoop() {
  let stopped = false;
  let intervalId = null;
  let ctx = null;

  const doStart = async () => {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      // Aguarda o contexto ficar ativo (necessário por política do navegador)
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const playTruckHorn = () => {
        if (stopped || !ctx || ctx.state === 'closed') return;

        const now = ctx.currentTime;
        const frequencies = [100, 120, 135];
        const masterGain = ctx.createGain();
        masterGain.connect(ctx.destination);
        masterGain.gain.setValueAtTime(0, now);
        masterGain.gain.linearRampToValueAtTime(0.9, now + 0.1);
        masterGain.gain.setValueAtTime(0.9, now + 1.8);
        masterGain.gain.linearRampToValueAtTime(0, now + 2.0);

        frequencies.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const oscGain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, now);
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

      if (!stopped) {
        playTruckHorn();
        intervalId = setInterval(playTruckHorn, 2500);
      }
    } catch (e) {
      console.error('Erro ao tocar buzina:', e);
    }
  };

  doStart();

  return () => {
    stopped = true;
    clearInterval(intervalId);
    try { ctx?.close(); } catch (e) {}
  };
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