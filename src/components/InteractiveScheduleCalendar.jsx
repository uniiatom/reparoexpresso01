import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Clock, ChevronLeft, ChevronRight, Sun, Sunset } from 'lucide-react';
import { cn } from '@/lib/utils';
import { addDays, format, startOfDay, getDay, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TIME_SLOTS = Array.from({ length: 11 }, (_, i) => `${String(7 + i).padStart(2, '0')}:00`);
const MORNING = TIME_SLOTS.filter(t => parseInt(t) < 12);  // 07, 08, 09, 10, 11
const AFTERNOON = TIME_SLOTS.filter(t => parseInt(t) >= 12); // 12, 13, 14, 15, 16, 17

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Ocupação: 0=livre, 1=parcial, 2=lotado
function useAvailabilityMap(monthDate, providerId = null) {
  const monthStart = format(startOfMonth(monthDate), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(monthDate), 'yyyy-MM-dd');

  const { data: allServices = [], isLoading } = useQuery({
    queryKey: ['schedule-availability', monthStart, providerId],
    queryFn: async () => {
      const filter = providerId
        ? { modality: 'agendado', provider_id: providerId }
        : { modality: 'agendado' };
      const services = await base44.entities.ServiceRequest.filter(filter, '-scheduled_date', 200);
      const ACTIVE = ['agendado', 'aceito', 'a_caminho', 'em_andamento'];
      return services.filter(s =>
        s.scheduled_date >= monthStart &&
        s.scheduled_date <= monthEnd &&
        ACTIVE.includes(s.status)
      );
    },
    staleTime: 30000,
  });

  // Mapa: { 'yyyy-MM-dd': { 'HH:00': count } }
  const slotMap = {};
  allServices.forEach(s => {
    if (!s.scheduled_date || !s.scheduled_time) return;
    if (!slotMap[s.scheduled_date]) slotMap[s.scheduled_date] = {};
    slotMap[s.scheduled_date][s.scheduled_time] = (slotMap[s.scheduled_date][s.scheduled_time] || 0) + 1;
  });

  return { slotMap, isLoading };
}

function SlotOccupancy({ count }) {
  if (count === 0) return <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />;
  if (count === 1) return <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />;
  return <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />;
}

export default function InteractiveScheduleCalendar({ selectedDate, selectedTime, onDateChange, onTimeChange, providerId = null }) {
  const today = startOfDay(new Date());
  const [viewMonth, setViewMonth] = useState(startOfMonth(addDays(today, 1)));
  const [activeTurno, setActiveTurno] = useState('manha');

  const { slotMap, isLoading } = useAvailabilityMap(viewMonth, providerId);

  const monthDays = eachDayOfInterval({ start: startOfMonth(viewMonth), end: endOfMonth(viewMonth) });
  // Pad com dias antes do primeiro dia da semana
  const firstDayOfWeek = getDay(startOfMonth(viewMonth));
  const paddedDays = [...Array(firstDayOfWeek).fill(null), ...monthDays];

  const isDisabled = (day) => !day || isBefore(day, addDays(today, 1));

  const getSlotCount = (day, time) => {
    if (!day) return 0;
    const key = format(day, 'yyyy-MM-dd');
    return slotMap[key]?.[time] || 0;
  };

  const getDayOccupancy = (day) => {
    if (!day) return 'disabled';
    const dateKey = format(day, 'yyyy-MM-dd');
    const slots = slotMap[dateKey] || {};
    const totalBooked = TIME_SLOTS.reduce((sum, t) => sum + (slots[t] || 0), 0);
    if (totalBooked >= TIME_SLOTS.length * 3) return 'full';
    if (totalBooked > 0) return 'partial';
    return 'free';
  };

  const turnoSlots = activeTurno === 'manha' ? MORNING : AFTERNOON;
  const selectedDateStr = selectedDate ? format(new Date(selectedDate + 'T12:00:00'), 'yyyy-MM-dd') : null;

  const handleDayClick = (day) => {
    if (!day || isDisabled(day)) return;
    onDateChange(format(day, 'yyyy-MM-dd'));
    onTimeChange('');
  };

  return (
    <div className="space-y-4">
      {/* Month Navigator */}
      <div className="flex items-center justify-between bg-card rounded-2xl border border-border px-4 py-3">
        <button
          onClick={() => setViewMonth(m => startOfMonth(addMonths(m, -1)))}
          disabled={isBefore(startOfMonth(addMonths(viewMonth, -1)), startOfMonth(today))}
          className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-muted disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <p className="font-bold text-foreground capitalize">
            {format(viewMonth, 'MMMM yyyy', { locale: ptBR })}
          </p>
        </div>
        <button
          onClick={() => setViewMonth(m => startOfMonth(addMonths(m, 1)))}
          className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-muted transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-card rounded-2xl border border-border p-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {DAY_LABELS.map(d => (
            <div key={d} className="text-center text-[11px] font-semibold text-muted-foreground py-1">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
          {paddedDays.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} />;

            const dayStr = format(day, 'yyyy-MM-dd');
            const disabled = isDisabled(day);
            const occupancy = getDayOccupancy(day);
            const isSelected = dayStr === selectedDateStr;
            const isToday = format(today, 'yyyy-MM-dd') === dayStr;

            return (
              <button
                key={dayStr}
                onClick={() => handleDayClick(day)}
                disabled={disabled}
                className={cn(
                  'relative flex flex-col items-center justify-center rounded-xl py-2 text-sm font-medium transition-all',
                  isSelected && 'bg-primary text-primary-foreground shadow-md',
                  !isSelected && !disabled && 'hover:bg-muted text-foreground cursor-pointer',
                  !isSelected && disabled && 'text-muted-foreground opacity-40 cursor-not-allowed',
                  isToday && !isSelected && 'ring-2 ring-primary/30'
                )}
              >
                <span className="font-bold text-[13px]">{format(day, 'd')}</span>
                {!disabled && (
                  <span className={cn(
                    'w-1.5 h-1.5 rounded-full mt-0.5',
                    isSelected ? 'bg-white/70' :
                    occupancy === 'free' ? 'bg-green-400' :
                    occupancy === 'partial' ? 'bg-yellow-400' :
                    'bg-red-400'
                  )} />
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-green-400" />Disponível
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-yellow-400" />Parcial
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-red-400" />Cheio
          </div>
        </div>
      </div>

      {/* Time Slots */}
      {selectedDateStr && (
        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm text-foreground">
                {format(new Date(selectedDateStr + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR })}
              </span>
            </div>
            {isLoading && <span className="text-xs text-muted-foreground animate-pulse">Verificando...</span>}
          </div>

          {/* Turno Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTurno('manha')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all border',
                activeTurno === 'manha'
                  ? 'bg-amber-400/20 border-amber-400/50 text-amber-600'
                  : 'border-border text-muted-foreground hover:bg-muted'
              )}
            >
              <Sun className="w-3.5 h-3.5" /> Manhã (07–11h)
            </button>
            <button
              onClick={() => setActiveTurno('tarde')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all border',
                activeTurno === 'tarde'
                  ? 'bg-orange-400/20 border-orange-400/50 text-orange-600'
                  : 'border-border text-muted-foreground hover:bg-muted'
              )}
            >
              <Sunset className="w-3.5 h-3.5" /> Tarde (12–17h)
            </button>
          </div>

          {/* Slots grid */}
          <div className="grid grid-cols-3 gap-2">
            {turnoSlots.map(time => {
              const count = getSlotCount(new Date(selectedDateStr + 'T12:00:00'), time);
              const isFull = count >= 3;
              const isSelTime = selectedTime === time;

              return (
                <button
                  key={time}
                  onClick={() => !isFull && onTimeChange(time)}
                  disabled={isFull}
                  className={cn(
                    'flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all text-sm font-semibold',
                    isSelTime && 'border-primary bg-primary/10 text-primary',
                    !isSelTime && !isFull && 'border-border hover:border-primary/40 text-foreground',
                    isFull && 'border-border opacity-40 cursor-not-allowed text-muted-foreground'
                  )}
                >
                  <span>{time}</span>
                  <SlotOccupancy count={count} />
                  <span className="text-[10px] text-muted-foreground font-normal">
                    {isFull ? 'Indisponível' : count === 0 ? 'Livre' : 'Parcial'}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedTime && (
            <div className="bg-primary/5 rounded-xl p-3 border border-primary/20 text-sm text-center">
              <span className="font-semibold text-primary">✓ Horário selecionado: {selectedTime}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}