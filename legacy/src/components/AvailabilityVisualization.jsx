import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, getDay } from 'date-fns';

const TIME_SLOTS = Array.from({ length: 20 }, (_, i) => {
  const hour = 7 + Math.floor(i / 2);
  const minute = (i % 2) * 30;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
});

export default function AvailabilityVisualization({ providerId, selectedDate }) {
  // Fetch provider availability
  const { data: availability = [] } = useQuery({
    queryKey: ['provider-availability', providerId],
    queryFn: () => base44.entities.ProviderAvailability.filter({ provider_id: providerId }),
    enabled: !!providerId,
  });

  // Fetch booked services
  const { data: bookedServices = [] } = useQuery({
    queryKey: ['provider-booked-services', providerId, selectedDate],
    queryFn: async () => {
      if (!selectedDate) return [];
      const services = await base44.entities.ServiceRequest.filter({
        provider_id: providerId,
      });
      return services.filter(s => 
        s.scheduled_date && 
        format(new Date(s.scheduled_date), 'yyyy-MM-dd') === selectedDate
      ) || [];
    },
    enabled: !!providerId && !!selectedDate,
  });

  const dayAvailability = useMemo(() => {
    if (!selectedDate) return null;
    const dayOfWeek = getDay(new Date(selectedDate + 'T00:00:00'));
    return availability.find(a => a.day_of_week === dayOfWeek && a.is_available);
  }, [selectedDate, availability]);

  const bookedTimes = useMemo(() => {
    return bookedServices.map(s => s.scheduled_time);
  }, [bookedServices]);

  if (!selectedDate || !dayAvailability) {
    return (
      <Card className="rounded-2xl border-border">
        <CardContent className="p-4 text-center text-muted-foreground">
          Selecione uma data para ver a disponibilidade
        </CardContent>
      </Card>
    );
  }

  const availableSlots = TIME_SLOTS.filter(time => {
    const timeNum = parseInt(time.replace(':', ''));
    const startNum = parseInt(dayAvailability.start_time.replace(':', ''));
    const endNum = parseInt(dayAvailability.end_time.replace(':', ''));
    return timeNum >= startNum && timeNum < endNum;
  });

  const totalSlots = dayAvailability.max_slots_per_day || 5;
  const occupiedSlots = bookedServices.length;
  const availableCount = totalSlots - occupiedSlots;

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-border">
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-muted rounded-lg p-3 text-center">
                <Clock className="w-4 h-4 text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Horário</p>
                <p className="text-sm font-bold text-foreground">
                  {dayAvailability.start_time} - {dayAvailability.end_time}
                </p>
              </div>
              <div className="bg-primary/10 rounded-lg p-3 text-center">
                <CheckCircle2 className="w-4 h-4 text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Disponível</p>
                <p className="text-sm font-bold text-primary">{availableCount}/{totalSlots}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <Users className="w-4 h-4 text-red-600 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Ocupado</p>
                <p className="text-sm font-bold text-red-600">{occupiedSlots}</p>
              </div>
            </div>

            {/* Time Grid */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Horários do dia</p>
              <div className="grid grid-cols-4 gap-1">
                {availableSlots.map(time => {
                  const isBooked = bookedTimes.includes(time);
                  return (
                    <div
                      key={time}
                      className={cn(
                        'p-2 rounded-lg text-xs font-medium text-center transition-all',
                        isBooked
                          ? 'bg-red-100 text-red-700 opacity-60'
                          : 'bg-green-100 text-green-700'
                      )}
                      title={isBooked ? 'Ocupado' : 'Disponível'}
                    >
                      {time}
                      {isBooked && <span className="ml-1">✕</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Availability Badge */}
            {availableCount > 0 ? (
              <Badge className="w-full justify-center bg-green-100 text-green-700 hover:bg-green-100">
                ✓ {availableCount} slot{availableCount !== 1 ? 's' : ''} disponível{availableCount !== 1 ? 's' : ''}
              </Badge>
            ) : (
              <Badge className="w-full justify-center bg-red-100 text-red-700 hover:bg-red-100">
                ✕ Sem horários disponíveis
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}