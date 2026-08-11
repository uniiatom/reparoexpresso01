import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Bell, AlertTriangle, Clock, MapPin, Phone, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ExpiringServicesAlert() {
  const [expiringServices, setExpiringServices] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(new Set());
  const [isPlaying, setIsPlaying] = useState(false);

  // Busca serviços vencendo a cada 30 segundos
  useEffect(() => {
    const checkExpiring = async () => {
      try {
        const now = new Date();
        const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

        // Busca todos os serviços agendados
        const allServices = await base44.entities.ServiceRequest.filter({ status: 'agendado' }, '-scheduled_date', 500);

        const expiring = allServices.filter(service => {
          if (!service.scheduled_date || !service.scheduled_time) return false;

          const [hours, minutes] = service.scheduled_time.split(':');
          const scheduledDateTime = new Date(`${service.scheduled_date}T${hours}:${minutes}:00`);

          return scheduledDateTime >= now && scheduledDateTime <= twoHoursLater && !dismissedIds.has(service.id);
        });

        setExpiringServices(expiring);

        // Toca som se há serviços vencendo
        if (expiring.length > 0 && !isPlaying) {
          playAlertSound();
        }
      } catch (e) {
        console.error('[ExpiringAlert] Error:', e);
      }
    };

    const interval = setInterval(checkExpiring, 30000);
    checkExpiring(); // Executa na montagem
    return () => clearInterval(interval);
  }, [dismissedIds, isPlaying]);

  const playAlertSound = () => {
    setIsPlaying(true);
    // Toca um beep repetido para chamar atenção
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.value = 800;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        osc.start(audioContext.currentTime);
        osc.stop(audioContext.currentTime + 0.2);
      }, i * 300);
    }
    setTimeout(() => setIsPlaying(false), 1000);
  };

  const handleDismiss = (serviceId) => {
    setDismissedIds(prev => new Set([...prev, serviceId]));
  };

  if (expiringServices.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 max-w-md z-50 space-y-2">
      {/* Pulse light indicator */}
      <div className={cn(
        "w-full rounded-2xl p-4 border-2 flex items-center gap-3 animate-pulse",
        "bg-red-50 border-red-300 shadow-lg shadow-red-200"
      )}>
        <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse" />
        <span className="font-bold text-red-700 text-sm">
          🔴 {expiringServices.length} serviço(s) vencendo em breve
        </span>
      </div>

      {/* Lista de serviços vencendo */}
      {expiringServices.slice(0, 3).map(service => (
        <div
          key={service.id}
          className="bg-card border-2 border-orange-300 rounded-xl p-3 shadow-lg space-y-2 animate-pulse"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1">
              <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground text-sm">{service.client_name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" /> {service.scheduled_time}
                </p>
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 flex-shrink-0"
              onClick={() => handleDismiss(service.id)}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>

          <div className="text-xs text-muted-foreground space-y-1 pl-6">
            <p className="flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {service.address}{service.city ? `, ${service.city}` : ''}
            </p>
            {service.client_phone && (
              <p className="flex items-center gap-1">
                <Phone className="w-3 h-3" /> {service.client_phone}
              </p>
            )}
          </div>

          {service.service_number && (
            <p className="text-xs font-mono text-primary/60 pl-6">{service.service_number}</p>
          )}
        </div>
      ))}

      {expiringServices.length > 3 && (
        <div className="text-xs text-muted-foreground text-center py-1">
          +{expiringServices.length - 3} mais serviço(s)
        </div>
      )}
    </div>
  );
}