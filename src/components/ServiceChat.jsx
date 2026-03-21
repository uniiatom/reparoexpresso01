import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ServiceChat({ requestId, senderRole, senderName }) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const queryClient = useQueryClient();
  const bottomRef = useRef(null);
  const prevCountRef = useRef(0);

  const { data: messages = [] } = useQuery({
    queryKey: ['chat', requestId],
    queryFn: () => base44.entities.ChatMessage.filter({ request_id: requestId }, 'created_date', 100),
    refetchInterval: 4000,
    enabled: !!requestId,
  });

  // Conta não lidas das outras partes
  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      const newMsgs = messages.slice(prevCountRef.current);
      const fromOther = newMsgs.filter(m => m.sender_role !== senderRole);
      if (!open && fromOther.length > 0) {
        setUnread(u => u + fromOther.length);
      }
    }
    prevCountRef.current = messages.length;
  }, [messages.length]);

  // Scroll ao abrir e quando chegam novas mensagens
  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [open, messages.length]);

  const sendMessage = useMutation({
    mutationFn: () => base44.entities.ChatMessage.create({
      request_id: requestId,
      sender_role: senderRole,
      sender_name: senderName,
      text: text.trim(),
    }),
    onSuccess: () => {
      setText('');
      queryClient.invalidateQueries({ queryKey: ['chat', requestId] });
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

  return (
    <div className="bg-card rounded-3xl border border-border mb-5 overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          <span className="font-semibold text-foreground text-sm">Chat com {senderRole === 'cliente' ? 'o prestador' : 'o cliente'}</span>
          {unread > 0 && (
            <span className="bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
              {unread}
            </span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <>
          {/* Messages */}
          <div className="h-64 overflow-y-auto px-4 py-3 space-y-3 bg-muted/20 border-t border-border">
            {messages.length === 0 && (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-muted-foreground text-center">Nenhuma mensagem ainda.<br />Inicie a conversa!</p>
              </div>
            )}
            {messages.map((msg) => {
              const isMe = msg.sender_role === senderRole;
              return (
                <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-2.5",
                    isMe
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-card border border-border text-foreground rounded-bl-sm"
                  )}>
                    {!isMe && (
                      <p className="text-xs font-semibold mb-1 opacity-70">{msg.sender_name}</p>
                    )}
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                    <p className={cn("text-xs mt-1 opacity-60 text-right", isMe ? "text-primary-foreground" : "text-muted-foreground")}>
                      {format(new Date(msg.created_date), "HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2 px-4 py-3 border-t border-border bg-card">
            <Input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Escreva uma mensagem..."
              className="rounded-2xl flex-1 h-10"
            />
            <Button
              size="icon"
              className="rounded-2xl h-10 w-10 bg-primary text-primary-foreground flex-shrink-0"
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