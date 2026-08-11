import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send, ChevronDown, ChevronUp, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Gera um ID de conversa estável a partir dos IDs do lote
function getBatchChatId(batchRequests) {
  return 'batch_' + batchRequests.map(r => r.id).sort().join('_');
}

export default function BatchProviderChat({ batchRequests, senderRole, senderName }) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const queryClient = useQueryClient();
  const bottomRef = useRef(null);
  const prevCountRef = useRef(0);

  const chatId = getBatchChatId(batchRequests);

  const { data: messages = [] } = useQuery({
    queryKey: ['batch-chat', chatId],
    queryFn: () => base44.entities.ChatMessage.filter({ request_id: chatId }, 'created_date', 100),
    refetchInterval: 4000,
    enabled: !!chatId,
  });

  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      const newMsgs = messages.slice(prevCountRef.current);
      const fromOther = newMsgs.filter(m => m.sender_name !== senderName);
      if (!open && fromOther.length > 0) {
        setUnread(u => u + fromOther.length);
      }
    }
    prevCountRef.current = messages.length;
  }, [messages.length]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [open, messages.length]);

  const sendMessage = useMutation({
    mutationFn: () => base44.entities.ChatMessage.create({
      request_id: chatId,
      sender_role: senderRole,
      sender_name: senderName,
      text: text.trim(),
    }),
    onSuccess: () => {
      setText('');
      queryClient.invalidateQueries({ queryKey: ['batch-chat', chatId] });
    },
  });

  const handleSend = () => {
    if (!text.trim() || sendMessage.isPending) return;
    sendMessage.mutate();
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const providerNames = batchRequests.map(r => r.provider_name?.split(' ')[0]).filter(Boolean);

  return (
    <div className="bg-card rounded-3xl border border-purple-200 mb-5 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-purple-50/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-600" />
          <span className="font-semibold text-foreground text-sm">
            Chat entre prestadores
          </span>
          {providerNames.length > 0 && (
            <span className="text-xs text-muted-foreground">({providerNames.join(' & ')})</span>
          )}
          {unread > 0 && (
            <span className="bg-purple-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
              {unread}
            </span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <>
          <div className="px-4 py-2 bg-purple-50 border-t border-purple-100">
            <p className="text-xs text-purple-700 font-medium">💬 Canal exclusivo entre os prestadores deste atendimento</p>
          </div>
          <div className="h-64 overflow-y-auto px-4 py-3 space-y-3 bg-muted/20 border-t border-border">
            {messages.length === 0 && (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-muted-foreground text-center">Nenhuma mensagem ainda.<br />Coordene o atendimento aqui!</p>
              </div>
            )}
            {messages.map((msg) => {
              const isMe = msg.sender_name === senderName;
              return (
                <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-2.5",
                    isMe
                      ? "bg-purple-600 text-white rounded-br-sm"
                      : "bg-card border border-border text-foreground rounded-bl-sm"
                  )}>
                    {!isMe && (
                      <p className="text-xs font-semibold mb-1 opacity-70">{msg.sender_name}</p>
                    )}
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                    <p className={cn("text-xs mt-1 opacity-60 text-right", isMe ? "text-white" : "text-muted-foreground")}>
                      {format(new Date(msg.created_date), "HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <div className="flex gap-2 px-4 py-3 border-t border-border bg-card">
            <Input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Mensagem para o outro prestador..."
              className="rounded-2xl flex-1 h-10"
            />
            <Button
              size="icon"
              className="rounded-2xl h-10 w-10 bg-purple-600 hover:bg-purple-700 text-white flex-shrink-0"
              onClick={handleSend}
              disabled={!text.trim() || sendMessage.isPending}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}