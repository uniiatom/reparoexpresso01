import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

// AudioContext compartilhado — desbloqueado na primeira interação do usuário
let sharedCtx = null;

function getAudioContext() {
  if (!sharedCtx || sharedCtx.state === 'closed') {
    sharedCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return sharedCtx;
}

// Desbloqueia o AudioContext na primeira interação do usuário
if (typeof window !== 'undefined') {
  const unlock = () => {
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
    } catch (e) {}
  };
  ['touchstart', 'touchend', 'mousedown', 'click', 'keydown'].forEach(evt =>
    document.addEventListener(evt, unlock, { once: false, passive: true })
  );
}

// Toca uma buzina de caminhão (grave, potente) e retorna função para parar
export function startHornLoop() {
  let stopped = false;
  let intervalId = null;

  const playTruckHorn = () => {
    try {
      const ctx = getAudioContext();
      if (stopped || ctx.state === 'closed') return;

      // Se ainda suspenso, tenta resumir e agendá-lo
      if (ctx.state === 'suspended') {
        ctx.resume().then(playTruckHorn);
        return;
      }

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
    } catch (e) {
      console.error('Erro ao tocar buzina:', e);
    }
  };

  // Toca imediatamente
  playTruckHorn();
  intervalId = setInterval(playTruckHorn, 2500);

  return () => {
    stopped = true;
    clearInterval(intervalId);
  };
}

/**
 * Monitora novos chamados via subscribe em tempo real.
 * Dispara a buzina quando:
 * - status='aguardando' (chamado livre) OU
 * - status='aceito' com provider_id === providerId (chamado atribuído automaticamente ao prestador)
 */
// Persistência dos IDs vistos no sessionStorage para sobreviver à remontagem
function loadSeenIds() {
  try {
    const raw = sessionStorage.getItem('__seenJobIds');
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}
function saveSeenIds(set) {
  try {
    sessionStorage.setItem('__seenJobIds', JSON.stringify([...set]));
  } catch {}
}

export function useNewJobAlert({ enabled, onNewJob, providerId }) {
  const enabledRef = useRef(enabled);
  const providerIdRef = useRef(providerId);
  const seenIds = useRef(loadSeenIds()); // carrega do sessionStorage ao montar
  const onNewJobRef = useRef(onNewJob);
  const stopHornRef = useRef(null);

  useEffect(() => { enabledRef.current = enabled; }, [enabled]);
  useEffect(() => { providerIdRef.current = providerId; }, [providerId]);
  useEffect(() => { onNewJobRef.current = onNewJob; }, [onNewJob]);

  // Expõe funções globais para parar a buzina e limpar IDs vistos
  useEffect(() => {
    window.__stopProviderHorn = () => {
      stopHornRef.current?.();
      stopHornRef.current = null;
    };
    window.__clearSeenJobIds = () => {
      seenIds.current.clear();
      saveSeenIds(seenIds.current);
    };
    window.__markJobSeen = (id) => {
      seenIds.current.add(id);
      saveSeenIds(seenIds.current);
    };
    return () => {
      delete window.__stopProviderHorn;
      delete window.__clearSeenJobIds;
      delete window.__markJobSeen;
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      stopHornRef.current?.();
      stopHornRef.current = null;
      return;
    }

    const unsubscribe = base44.entities.ServiceRequest.subscribe((event) => {
      if (!enabledRef.current) return;

      const data = event.data;
      if (!data) return;

      // Chamado livre — APENAS em 'create' para evitar duplicação quando outro prestador recusa
      const isOpenJob =
        event.type === 'create' &&
        data.status === 'aguardando' &&
        data.modality !== 'agendado';

      // Chamado atribuído automaticamente a este prestador (backend assignServiceToProvider)
      const isAssignedToMe =
        event.type === 'update' &&
        data.status === 'aceito' &&
        providerIdRef.current &&
        data.provider_id === providerIdRef.current;

      const isNewJob = isOpenJob || isAssignedToMe;

      // Limpa seenIds APENAS quando job é finalizado (não quando volta p/ aguardando por recusa)
      const isFinalizado = event.type === 'update' && ['cancelado', 'concluido'].includes(data.status);
      if (isFinalizado) {
        seenIds.current.delete(event.id);
        saveSeenIds(seenIds.current);
      }

      // Garante que job recusado (voltou a aguardando) não re-notifica quem já viu
      const isRejectedBack = event.type === 'update' && data.status === 'aguardando';
      if (isRejectedBack) return;

      if (isNewJob && !seenIds.current.has(event.id)) {
        seenIds.current.add(event.id);
        saveSeenIds(seenIds.current);
        stopHornRef.current?.();
        stopHornRef.current = startHornLoop();
        onNewJobRef.current?.(data);
      }
    });

    return unsubscribe;
  }, [enabled]);
}