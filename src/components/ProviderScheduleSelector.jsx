import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addDays, startOfDay, endOfDay, parse, isBefore, isAfter } from 'date-fns';
import { pt } from 'date-fns/locale';

export default function ProviderScheduleSelector({ 
  providerId, 
  providerName,
  onScheduleSelected,
  serviceType,
  minDaysFromNow = 0 
}) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [availability, setAvailability] = useState([]);
  const [scheduledServices, setScheduledServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [availableSlots, setAvailableSlots] = useState([]);

  // Carrega disponibilidade do prestador
  useEffect(() => {
    if (!providerId) return;
    
    const loadData = async () => {
      setLoading(true);
      try {
        const [avail, scheduled] = await Promise.all([
          base44.entities.ProviderAvailability.filter({ provider_id: providerId }),
          base44.entities.ServiceRequest.filter({ 
            provider_id: providerId,
            status: { $in: ['agendado', 'aceito', 'a_caminho', 'em_andamento'] }
          })
        ]);
        setAvailability(avail);
        setScheduledServices(scheduled);
      } catch (err) {
        console.error('Erro ao carregar disponibilidade:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [providerId]);

  // Gera slots disponíveis para o dia selecionado
  useEffect(() => {
    if (!selectedDate || !availability.length) {
      setAvailableSlots([]);
      return;
    }

    const dayOfWeek = selectedDate.getDay();
    const dayAvailability = availability.filter(a => a.day_of_week === dayOfWeek);
    
    if (dayAvailability.length === 0) {
      setAvailableSlots([]);
      return;
    }

    // Gera horários em slots de 1 hora
    const slots = [];
    dayAvailability.forEach(av => {
      const [startHour, startMin] = av.start_time.split(':').map(Number);
      const [endHour, endMin] = av.end_time.split(':').map(Number);
      
      let current = new Date(selectedDate);
      current.setHours(startHour, startMin, 0);
      const endTime = new Date(selectedDate);
      endTime.setHours(endHour, endMin, 0);

      while (isBefore(current, endTime)) {
        const slotStart = new Date(current);
        const slotEnd = new Date(current);
        slotEnd.setHours(slotEnd.getHours() + 1);

        // Verifica conflito com serviços agendados
        const hasConflict = scheduledServices.some(service => {
          if (!service.scheduled_date || !service.scheduled_time) return false;
          const serviceStart = parse(
            `${service.scheduled_date} ${service.scheduled_time}`,
            'yyyy-MM-dd HH:mm',
            new Date()
          );
          const serviceEnd = new Date(serviceStart);
          serviceEnd.setHours(serviceEnd.getHours() + 2); // Assume 2 horas por serviço

          return (
            (isAfter(slotStart, serviceStart) && isBefore(slotStart, serviceEnd)) ||
            (isAfter(serviceStart, slotStart) && isBefore(serviceStart, slotEnd))
          );
        });

        slots.push({
          start: slotStart,
          end: slotEnd,
          time: format(slotStart, 'HH:mm'),
          available: !hasConflict
        });

        current.setHours(current.getHours() + 1);
      }
    });

    setAvailableSlots(slots);
    setSelectedTime(null);
  }, [selectedDate, availability, scheduledServices]);

  // Gera datas disponíveis (próximos 60 dias)
  const generateDates = () => {
    const dates = [];
    for (let i = minDaysFromNow; i < 60; i++) {
      const date = addDays(new Date(), i);
      const dayOfWeek = date.getDay();
      const hasAvailability = availability.some(a => a.day_of_week === dayOfWeek);
      
      if (hasAvailability) {
        dates.push({
          date,
          label: format(date, 'EEE, dd MMM', { locale: pt }),
          dayOfWeek
        });
      }
    }
    return dates;
  };

  const dates = generateDates();
  const hasSelectedSlot = selectedDate && selectedTime;

  if (loading) {
    return (
      <div className="bg-card rounded-2xl p-6 border border-border">
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">Agendar com {providerName}</h3>
      </div>

      {/* Seleção de Data */}
      <div>
        <p className="text-sm font-semibold text-foreground mb-3">Escolha uma data</p>
        <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
          {dates.map((d, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedDate(d.date)}
              className={cn(
                "p-3 rounded-xl border-2 transition-all text-sm text-center",
                selectedDate?.toDateString() === d.date.toDateString()
                  ? "border-primary bg-primary/10 text-primary font-semibold"
                  : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Seleção de Horário */}
      {selectedDate && (
        <div>
          <p className="text-sm font-semibold text-foreground mb-3">
            Horários disponíveis em {format(selectedDate, 'dd/MM', { locale: pt })}
          </p>
          
          {availableSlots.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-800">Nenhum horário disponível nesta data</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
              {availableSlots.map((slot, idx) => (
                <button
                  key={idx}
                  onClick={() => slot.available && setSelectedTime(slot.time)}
                  disabled={!slot.available}
                  className={cn(
                    "p-2 rounded-lg border text-sm font-semibold transition-all flex items-center justify-center gap-1",
                    slot.available
                      ? selectedTime === slot.time
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary bg-muted hover:bg-muted/80 text-foreground cursor-pointer"
                      : "border-destructive/30 bg-destructive/5 text-destructive/50 cursor-not-allowed opacity-50"
                  )}
                >
                  <Clock className="w-3 h-3" />
                  {slot.time}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Resumo da Seleção */}
      {hasSelectedSlot && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-900 mb-1">Horário selecionado</p>
              <p className="text-xs text-green-800">
                {format(selectedDate, 'EEEE, dd MMMM', { locale: pt })} às {selectedTime}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Botão de Confirmação */}
      <Button
        className="w-full bg-primary text-primary-foreground font-semibold rounded-xl h-11"
        onClick={() => {
          if (hasSelectedSlot) {
            onScheduleSelected({
              date: format(selectedDate, 'yyyy-MM-dd'),
              time: selectedTime,
              providerId,
              providerName
            });
          }
        }}
        disabled={!hasSelectedSlot}
      >
        Confirmar Agendamento
      </Button>
    </div>
  );
}