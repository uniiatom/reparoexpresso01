import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Calendar, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { addDays, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, getDay } from 'date-fns';

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
const TIME_SLOTS = Array.from({ length: 20 }, (_, i) => {
  const hour = 7 + Math.floor(i / 2);
  const minute = (i % 2) * 30;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
});

export default function ScheduleCalendar({ providerId, onScheduleSelect, serviceType }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Fetch provider availability
  const { data: availability = [] } = useQuery({
    queryKey: ['provider-availability', providerId],
    queryFn: () => base44.entities.ProviderAvailability.filter({ provider_id: providerId }),
    enabled: !!providerId,
  });

  // Fetch booked services for this provider
  const { data: bookedServices = [] } = useQuery({
    queryKey: ['booked-services', providerId],
    queryFn: async () => {
      const services = await base44.entities.ServiceRequest.filter({
        provider_id: providerId,
        status: 'agendado',
      });
      return services || [];
    },
    enabled: !!providerId,
  });

  const isTimeAvailable = (date, time) => {
    // Check if day of week matches availability
    const dayOfWeek = getDay(date);
    const dayAvailability = availability.find(a => a.day_of_week === dayOfWeek && a.is_available);

    if (!dayAvailability) return false;

    // Check if time is within available hours
    const timeNum = parseInt(time.replace(':', ''));
    const startNum = parseInt(dayAvailability.start_time.replace(':', ''));
    const endNum = parseInt(dayAvailability.end_time.replace(':', ''));

    if (timeNum < startNum || timeNum >= endNum) return false;

    // Check if slot is already booked
    const dateStr = format(date, 'yyyy-MM-dd');
    const bookedCount = bookedServices.filter(s => {
      const bookedDate = format(new Date(s.scheduled_date), 'yyyy-MM-dd');
      const bookedTime = s.scheduled_time;
      return bookedDate === dateStr && bookedTime === time;
    }).length;

    return bookedCount === 0;
  };

  const isDateAvailable = (date) => {
    // Check if any time slot is available for this date
    const dayOfWeek = getDay(date);
    return availability.some(a => a.day_of_week === dayOfWeek && a.is_available);
  };

  const handleScheduleSelect = () => {
    if (selectedDate && selectedTime) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      onScheduleSelect({
        scheduled_date: dateStr,
        scheduled_time: selectedTime,
      });
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const availableTimes = selectedDate
    ? TIME_SLOTS.filter(time => isTimeAvailable(selectedDate, time))
    : [];

  return (
    <div className="space-y-4">
      {/* Calendar */}
      <div className="bg-card rounded-2xl p-4 border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" /> Selecione uma data
          </h3>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentMonth(addDays(currentMonth, -30))}
              className="rounded-lg"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-semibold text-foreground px-2 py-1 min-w-fit">
              {format(currentMonth, 'MMMM yyyy', { locale: { months: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'] } })}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentMonth(addDays(currentMonth, 30))}
              className="rounded-lg"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {DAYS.map(day => (
            <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, idx) => {
            const isAvailable = isDateAvailable(day);
            const isSelected = selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
            const isPast = day < new Date() && !isToday(day);

            return (
              <motion.button
                key={idx}
                whileHover={isAvailable && !isPast ? { scale: 1.05 } : {}}
                onClick={() => isAvailable && !isPast && setSelectedDate(day)}
                disabled={!isAvailable || isPast}
                className={cn(
                  'p-2 rounded-lg text-sm font-medium transition-all',
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : isAvailable && !isPast
                    ? 'bg-muted hover:bg-accent text-foreground cursor-pointer'
                    : 'bg-muted/50 text-muted-foreground cursor-not-allowed opacity-50'
                )}
              >
                {format(day, 'd')}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Time slots */}
      {selectedDate && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-4 border border-border"
        >
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" /> Horários disponíveis em {format(selectedDate, 'dd/MM/yyyy')}
          </h3>

          {availableTimes.length > 0 ? (
            <div className="grid grid-cols-4 gap-2">
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
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum horário disponível para este dia
            </p>
          )}
        </motion.div>
      )}

      {/* Selection summary and button */}
      {selectedDate && selectedTime && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary/5 rounded-2xl p-4 border border-primary/20"
        >
          <p className="text-sm text-foreground mb-3">
            <span className="font-semibold">Agendamento selecionado:</span><br />
            {format(selectedDate, 'EEEE, dd/MM/yyyy')} às {selectedTime}
          </p>
          <Button
            onClick={handleScheduleSelect}
            className="w-full bg-primary text-primary-foreground rounded-2xl h-11 font-semibold"
          >
            Confirmar horário
          </Button>
        </motion.div>
      )}
    </div>
  );
}