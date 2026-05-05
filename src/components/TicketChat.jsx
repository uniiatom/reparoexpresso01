import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Send, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function TicketChat({ ticketId, senderRole, senderName }) {
  const [text, setText] = useState('');
  const bottomRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery({
    queryKey: ['ticket-messages', ticketId],
    queryFn: () => base44.entities.TicketMessage.filter({ ticket_id: ticketId }, 'created_date'),
    enabled: !!ticketId,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  // Subscription em tempo real
  useEffect(() => {
    if (!ticketId) return;
    const unsubscribe = base44.entities.TicketMessage.subscribe((event) => {
      if (event.data?.ticket_id === ticketId || event.type === 'create') {
        queryClient.invalidateQueries({ queryKey: ['ticket-messages', ticketId] });
      }
    });
    return unsubscribe;
  }, [ticketId, queryClient]);

  // Scroll para baixo ao chegar nova mensagem
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const sendMessage = useMutation({
    mutationFn: (data) => base44.entities.TicketMessage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-messages', ticketId] });
      setText('');
    },
  });

  const handleSend = () => {
    if (!text.trim()) return;
    sendMessage.mutate({
      ticket_id: ticketId,
      sender_role: senderRole,
      sender_name: senderName,
      text: text.trim(),
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-primary/5">
        <MessageCircle className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold text-primary">Chat em tempo real</span>
        <span className="ml-auto text-xs text-muted-foreground">{messages.length} msg(s)</span>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[180px] max-h-[320px]">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-6 text-center">
            <MessageCircle className="w-8 h-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">Nenhuma mensagem ainda.</p>
            <p className="text-xs text-muted-foreground">Inicie a conversa!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_role === senderRole;
            return (
              <div key={msg.id} className={cn('flex flex-col', isMe ? 'items-end' : 'items-start')}>
                <div className={cn(
                  'max-w-[85%] px-3 py-2 rounded-2xl text-sm',
                  isMe
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-muted text-foreground rounded-bl-sm'
                )}>
                  <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                </div>
                <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
                  {msg.sender_name} · {format(new Date(msg.created_date), 'HH:mm', { locale: ptBR })}
                </span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 p-3 border-t border-border">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite sua mensagem... (Enter para enviar)"
          rows={1}
          className="flex-1 px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!text.trim() || sendMessage.isPending}
          className="rounded-xl flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}