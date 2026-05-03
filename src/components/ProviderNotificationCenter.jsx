import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Bell, X, CheckCircle2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ProviderNotificationCenter({ providerId }) {
  const [showNotifications, setShowNotifications] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ['provider-notifications', providerId],
    queryFn: async () => {
      if (!providerId) return [];
      const list = await base44.entities.ProviderNotification.filter({ 
        provider_id: providerId,
        is_read: false
      }, '-created_date');
      return list;
    },
    enabled: !!providerId,
    refetchInterval: 30000, // Atualiza a cada 30s
  });

  const handleMarkAsRead = async (notificationId) => {
    await base44.entities.ProviderNotification.update(notificationId, {
      is_read: true,
      read_at: new Date().toISOString()
    });
  };

  const unreadCount = notifications.length;

  return (
    <>
      {/* Ícone de notificação com badge */}
      <div className="relative">
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative p-2 hover:bg-muted rounded-lg transition"
        >
          <Bell className="w-5 h-5 text-foreground" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-destructive text-white text-xs font-bold rounded-full">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </button>

        {/* Painel de notificações */}
        {showNotifications && (
          <div className="absolute right-0 top-full mt-2 w-80 bg-card rounded-2xl shadow-2xl border border-border z-50 max-h-96 overflow-y-auto">
            <div className="sticky top-0 bg-card rounded-t-2xl p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-foreground">Notificações</h3>
              <button
                onClick={() => setShowNotifications(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {notifications.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map(notif => (
                  <div key={notif.id} className="p-4 hover:bg-muted/50 transition">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-semibold text-foreground text-sm">{notif.title}</h4>
                      <button
                        onClick={() => handleMarkAsRead(notif.id)}
                        className="text-primary hover:text-primary/80 flex-shrink-0"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 whitespace-pre-line">
                      {notif.message}
                    </p>
                    {notif.action_url && (
                      <a
                        href={notif.action_url}
                        className="text-xs text-primary hover:underline font-semibold"
                        onClick={() => handleMarkAsRead(notif.id)}
                      >
                        Ver mais →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}