import { useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const STORAGE_KEY = 'attendant_push_enabled';
const SEEN_TICKETS_KEY = 'attendant_seen_tickets';

function playAlertSound(type = 'new') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const freq = type === 'new' ? 880 : type === 'reply' ? 660 : 440;
    const duration = type === 'urgent' ? 0.6 : 0.3;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
    if (type === 'urgent') {
      // Segundo beep para urgente
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        osc2.connect(g2);
        g2.connect(ctx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1100, ctx.currentTime);
        g2.gain.setValueAtTime(0.5, ctx.currentTime);
        g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + 0.5);
      }, 400);
    }
  } catch (_) {}
}

function showBrowserPush(title, body, tag) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, tag, icon: '/icon-192.png' });
  }
}

function getSeenTickets() {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_TICKETS_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function saveSeenTickets(set) {
  const arr = [...set].slice(-500); // mantém só os 500 últimos
  localStorage.setItem(SEEN_TICKETS_KEY, JSON.stringify(arr));
}

/**
 * Hook que monitora tickets em tempo real e dispara alertas para o atendente logado.
 * @param {object|null} attendant - atendente logado (ou null)
 */
export function useAttendantPush(attendant) {
  const seenRef = useRef(getSeenTickets());
  const ticketsSnapshotRef = useRef(null);

  // Solicita permissão de notificação do browser quando o atendente loga
  useEffect(() => {
    if (!attendant) return;
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [attendant]);

  // Alerta de ticket quase vencendo (> 24h aberto sem resposta)
  const checkExpiring = useCallback((tickets) => {
    if (!tickets) return;
    const now = Date.now();
    tickets.forEach(ticket => {
      if (ticket.status !== 'aberto' && ticket.status !== 'em_atendimento') return;
      if (ticket.responded_at) return;
      const created = new Date(ticket.created_date).getTime();
      const hoursOpen = (now - created) / 3600000;
      const urgKey = `expiring_${ticket.id}`;
      const alreadyAlerted = seenRef.current.has(urgKey);
      if (hoursOpen >= 22 && hoursOpen < 26 && !alreadyAlerted) {
        seenRef.current.add(urgKey);
        saveSeenTickets(seenRef.current);
        playAlertSound('urgent');
        toast.warning(`⚠️ Ticket quase vencendo!`, {
          description: `"${ticket.subject}" está há ${Math.floor(hoursOpen)}h sem resposta.`,
          duration: 10000,
        });
        showBrowserPush(
          '⚠️ Ticket quase vencendo',
          `"${ticket.subject}" está há ${Math.floor(hoursOpen)}h sem resposta.`,
          urgKey
        );
      }
    });
  }, []);

  // Subscrição em tempo real via base44
  useEffect(() => {
    if (!attendant) return;

    const unsubscribe = base44.entities.Ticket.subscribe((event) => {
      const ticket = event.data;
      if (!ticket) return;

      // --- NOVO TICKET ---
      if (event.type === 'create') {
        const key = `new_${ticket.id}`;
        if (!seenRef.current.has(key)) {
          seenRef.current.add(key);
          saveSeenTickets(seenRef.current);
          playAlertSound('new');
          const typeLabels = { reclamacao: 'Reclamação', elogio: 'Elogio', sugestao: 'Sugestão', duvida: 'Dúvida' };
          toast.info(`🎫 Novo ticket aberto!`, {
            description: `${typeLabels[ticket.type] || 'Ticket'}: "${ticket.subject}" — ${ticket.client_name || 'Cliente'}`,
            duration: 8000,
          });
          showBrowserPush(
            `🎫 Novo ticket: ${typeLabels[ticket.type] || ''}`,
            `"${ticket.subject}" — ${ticket.client_name || 'Cliente'}`,
            key
          );
        }
      }

      // --- RESPOSTA DO CLIENTE (atualização com nova mensagem) ---
      if (event.type === 'update') {
        const prev = ticketsSnapshotRef.current?.find?.(t => t.id === ticket.id);
        // Detecta que o cliente enviou nova mensagem (updated_date mais recente e sem respondido ainda)
        const isClientReply =
          prev &&
          ticket.updated_date !== prev.updated_date &&
          !ticket.responded_at &&
          ticket.message !== prev.message;

        if (isClientReply) {
          const key = `reply_${ticket.id}_${ticket.updated_date}`;
          if (!seenRef.current.has(key)) {
            seenRef.current.add(key);
            saveSeenTickets(seenRef.current);
            playAlertSound('reply');
            toast.info(`💬 Cliente respondeu!`, {
              description: `No ticket "${ticket.subject}" — ${ticket.client_name || 'Cliente'}`,
              duration: 8000,
            });
            showBrowserPush(
              `💬 Resposta no ticket`,
              `"${ticket.subject}" — ${ticket.client_name || 'Cliente'} respondeu.`,
              key
            );
          }
        }

        // Alerta de urgência ao mudar prioridade para urgente
        if (prev && ticket.priority === 'urgente' && prev.priority !== 'urgente') {
          const key = `urgent_priority_${ticket.id}`;
          if (!seenRef.current.has(key)) {
            seenRef.current.add(key);
            saveSeenTickets(seenRef.current);
            playAlertSound('urgent');
            toast.error(`🚨 Ticket marcado como URGENTE!`, {
              description: `"${ticket.subject}"`,
              duration: 10000,
            });
            showBrowserPush(
              `🚨 Ticket URGENTE`,
              `"${ticket.subject}" foi marcado como urgente.`,
              key
            );
          }
        }
      }
    });

    return () => unsubscribe();
  }, [attendant]);

  // Polling para checar tickets quase vencendo (a cada 10 min)
  useEffect(() => {
    if (!attendant) return;

    const fetchAndCheck = async () => {
      const tickets = await base44.entities.Ticket.list('-created_date', 200);
      ticketsSnapshotRef.current = tickets;
      checkExpiring(tickets);
    };

    fetchAndCheck();
    const interval = setInterval(fetchAndCheck, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [attendant, checkExpiring]);
}