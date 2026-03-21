import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { addDays, format, startOfDay, isBefore, getDay, addMinutes } from 'date-fns';

const TIME_SLOTS = Array.from({ length: 20 }, (_, i) => {
  const hour = 7 + Math.floor(i / 2);
  const minute = (i % 2) * 30;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
});

export default function ClientScheduleSelector({ providerId, onScheduleSelect, compact = false }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [showNext7Days, setShowNext7Days] = useState(true);

  // Fetch provider availability
  const { data: availability = [] } = useQuery({
    queryKey: ['provider-availability', providerId],
    queryFn: () => base44.entities.ProviderAvailability.filter({ provider_id: providerId }),
    enabled: !!providerId,
  });

  // Fetch booked services for this provider
  const { data: bookedServices = [] } = useQuery({
    queryKey: ['provider-booked-services', providerId],
    queryFn: async () => {
      const services = await base44.entities.ServiceRequest.filter({
        provider_id: providerId,
        status: 'aceito',
      });
      return services || [];
    },
    enabled: !!providerId,
  });

  const isTimeAvailable = (date, time) => {
    const dayOfWeek = getDay(date);
    const dayAvailability = availability.find(a => a.day_of_week === dayOfWeek && a.is_available);

    if (!dayAvailability) return false;

    const timeNum = parseInt(time.replace(':', ''));
    const startNum = parseInt(dayAvailability.start_time.replace(':', ''));
    const endNum = parseInt(dayAvailability.end_time.replace(':', ''));

    if (timeNum < startNum || timeNum >= endNum) return false;

    // Check if slot is already booked (count active bookings for that time)
    const dateStr = format(date, 'yyyy-MM-dd');
    const bookedCount = bookedServices.filter(s => {
      const bookedDate = s.scheduled_date && format(new Date(s.scheduled_date), 'yyyy-MM-dd') === dateStr;
      return bookedDate && s.scheduled_time === time;
    }).length;

    // Respect max slots per day
    const bookedForDay = bookedServices.filter(s => {
      const bookedDate = s.scheduled_date && format(new Date(s.scheduled_date), 'yyyy-MM-dd') === dateStr;
      return bookedDate;
    }).length;

    return bookedCount === 0 && bookedForDay < (dayAvailability.max_slots_per_day || 5);
  };

  const isDateAvailable = (date) => {
    const dayOfWeek = getDay(date);
    return availability.some(a => a.day_of_week === dayOfWeek && a.is_available);
  };

  const handleConfirm = () => {
    if (selectedDate && selectedTime) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      onScheduleSelect({
        scheduled_date: dateStr,
        scheduled_time: selectedTime,
      });
    }
  };

  // Generate next 30 days
  const today = startOfDay(new Date());
  const nextDays = Array.from({ length: 30 }, (_, i) => addDays(today, i + 1));
  const displayDays = showNext7Days ? nextDays.slice(0, 7) : nextDays;

  const availableTimes = selectedDate
    ? TIME_SLOTS.filter(time => isTimeAvailable(selectedDate, time))
    : [];

  const selectedDayAvailability = selectedDate
    ? availability.find(a => a.day_of_week === getDay(selectedDate) && a.is_available)
    : null;

  if (compact) {
    return (
      <Card className="rounded-2xl border-primary/20">
        <CardContent className="p-4 space-y-3">
          <h3 className="font-semibold text-foreground text-sm">Agendar serviço</h3>
          
          <div className="grid grid-cols-7 gap-1">
            {nextDays.slice(0, 7).map(day => {
              const isAvailable = isDateAvailable(day);
              const isSelected = selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
              
              return (
                <button
                  key={format(day, 'yyyy-MM-dd')}
                  onClick={() => isAvailable && setSelectedDate(day)}
                  disabled={!isAvailable}
                  className={cn(
                    'p-2 rounded-lg text-xs font-medium transition-all',
                    isSelected ? 'bg-primary text-primary-foreground' : isAvailable ? 'bg-muted hover:bg-accent text-foreground' : 'bg-muted/50 text-muted-foreground opacity-50 cursor-not-allowed',
                  )}
                >
                  <div className="font-bold">{format(day, 'd')}</div>
                  <div className="text-[10px]">{format(day, 'EEE', { locale: { days: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'] } })}</div>
                </button>
              );
            })}
          </div>

          {selectedDate && availableTimes.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Horários disponíveis</label>
              <div className="grid grid-cols-4 gap-1">
                {availableTimes.slice(0, 8).map(time => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={cn(
                      'p-1.5 rounded-lg text-xs font-medium transition-all',
                      selectedTime === time ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent text-foreground',
                    )}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedDate && selectedTime && (
            <Button
              onClick={handleConfirm}
              className="w-full h-9 rounded-lg bg-primary text-primary-foreground font-semibold text-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Confirmar
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-primary" /> Escolha um horário
        </h2>
        <p className="text-muted-foreground text-sm">Selecione a data e horário desejados</p>
      </div>

      {!availability.length && (
        <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-2xl border border-yellow-200">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-700">Este prestador ainda não configurou sua disponibilidade.</p>
        </div>
      )}

      {/* Week/Month Toggle */}
      <div className="flex gap-2">
        <Button
          variant={showNext7Days ? 'default' : 'outline'}
          onClick={() => setShowNext7Days(true)}
          className="flex-1 rounded-xl"
          size="sm"
        >
          Próximos 7 dias
        </Button>
        <Button
          variant={!showNext7Days ? 'default' : 'outline'}
          onClick={() => setShowNext7Days(false)}
          className="flex-1 rounded-xl"
          size="sm"
        >
          Próximos 30 dias
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-card rounded-2xl p-4 border border-border">
        <div className="grid grid-cols-7 gap-2">
          {displayDays.map((day, idx) => {
            const isAvailable = isDateAvailable(day);
            const isSelected = selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');

            return (
              <motion.button
                key={format(day, 'yyyy-MM-dd')}
                whileHover={isAvailable ? { scale: 1.05 } : {}}
                onClick={() => isAvailable && setSelectedDate(day)}
                disabled={!isAvailable}
                className={cn(
                  'p-2 rounded-lg text-sm font-medium transition-all',
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : isAvailable
                    ? 'bg-muted hover:bg-accent text-foreground cursor-pointer'
                    : 'bg-muted/50 text-muted-foreground cursor-not-allowed opacity-50'
                )}
              >
                <div className="font-bold">{format(day, 'd')}</div>
                <div className="text-xs">{format(day, 'EEE')}</div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Time Slots */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-card rounded-2xl p-4 border border-border"
          >
            <div className="mb-4">
              <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> Horários em {format(selectedDate, 'dd/MM')}
              </h3>
              {selectedDayAvailability && (
                <p className="text-xs text-muted-foreground">
                  Disponível: {selectedDayAvailability.start_time} - {selectedDayAvailability.end_time}
                </p>
              )}
            </div>

            {availableTimes.length > 0 ? (
              <div className="grid grid-cols-5 gap-2">
                {availableTimes.map(time => (
                  <motion.button
                    key={time}
                    whileHover={{ scale: 1.05 }}
                    onClick={() => setSelectedTime(time)}
                    className={cn(
                      'p-2 rounded-lg text-sm font-medium transition-all',
                      selectedTime === time
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-accent text-foreground'
                    )}
                  >
                    {time}
                  </motion.button>
                ))}
              </div>
            ) : (
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">Nenhum horário disponível para este dia</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation */}
      <AnimatePresence>
        {selectedDate && selectedTime && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-primary/5 rounded-2xl p-4 border border-primary/20"
          >
            <p className="text-sm text-foreground mb-3">
              <span className="font-semibold">Agendamento selecionado:</span><br />
              <span className="text-primary font-bold">
                {format(selectedDate, 'EEEE, dd/MM/yyyy')} às {selectedTime}
              </span>
            </p>
            <Button
              onClick={handleConfirm}
              className="w-full bg-primary text-primary-foreground rounded-2xl h-11 font-semibold"
            >
              <CheckCircle2 className="w-5 h-5 mr-2" /> Confirmar horário
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}