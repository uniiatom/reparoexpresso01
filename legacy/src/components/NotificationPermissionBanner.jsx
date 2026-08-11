import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Bell, X } from "lucide-react";

export default function NotificationPermissionBanner() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Only show if browser supports notifications and permission not yet granted
    if ('Notification' in window && Notification.permission === 'default' && !dismissed) {
      setShow(true);
    }
  }, [dismissed]);

  const handleRequest = async () => {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setShow(false);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 max-w-sm mx-auto z-40 bg-card rounded-2xl border border-border shadow-lg p-4">
      <div className="flex items-start gap-3">
        <Bell className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Ative notificações</p>
          <p className="text-xs text-muted-foreground mt-1">
            Receba alertas em tempo real quando o prestador aceitar seu pedido, sair para atender e concluir o trabalho.
          </p>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              onClick={handleRequest}
              className="h-8 text-xs rounded-lg bg-primary text-primary-foreground"
            >
              Ativar
            </Button>
            <button
              onClick={handleDismiss}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Agora não
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 hover:bg-muted rounded-lg transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}