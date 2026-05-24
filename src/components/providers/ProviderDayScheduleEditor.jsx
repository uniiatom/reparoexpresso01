import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WEEKDAYS } from '@/lib/constants/providerServiceTypes';
import {
  addSlotToDay,
  dayHasConfiguredSlots,
  getSlotsForDay,
  removeSlotFromDay,
  setActiveDay,
  setMaxSlotsPerDay,
  updateSlotOnDay,
} from '@/lib/providerSchedule';

/**
 * Editor de horários por dia da semana (vários intervalos por dia).
 */
export function ProviderDayScheduleEditor({ schedule, onChange, showMaxSlots = true }) {
  const activeDay = schedule.activeDay ?? 1;
  const activeSlots = getSlotsForDay(schedule, activeDay);
  const activeDayLabel = WEEKDAYS.find((d) => d.value === activeDay)?.label ?? '';

  const handleSelectDay = (day) => {
    onChange(setActiveDay(schedule, day));
  };

  const slotsToRender = activeSlots.length ? activeSlots : [{ startTime: '', endTime: '' }];

  return (
    <div className="space-y-4">
      <div>
        <Label className="mb-2 block">Dias da semana</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Selecione um dia e configure os horários dele. Cada dia pode ter intervalos diferentes.
        </p>
        <p className="text-xs text-muted-foreground mb-2">
          Ex.: Segunda 08:00–13:00 e 15:00–18:00 · Terça 09:00–11:00
        </p>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((day) => {
            const isEditing = activeDay === day.value;
            const hasHours = dayHasConfiguredSlots(getSlotsForDay(schedule, day.value));
            return (
              <button
                key={day.value}
                type="button"
                onClick={() => handleSelectDay(day.value)}
                className={cn(
                  'relative px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors',
                  isEditing
                    ? 'border-primary bg-primary/10 text-primary'
                    : hasHours
                      ? 'border-primary/40 bg-primary/5 text-foreground'
                      : 'border-border text-muted-foreground hover:border-primary/30',
                )}
              >
                {day.label}
                {hasHours && !isEditing && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-border/60 p-3 bg-muted/20">
        <div className="flex items-center justify-between gap-2">
          <Label>Horários — {activeDayLabel} *</Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 rounded-xl shrink-0"
            onClick={() => onChange(addSlotToDay(schedule, activeDay))}
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar intervalo
          </Button>
        </div>

        {slotsToRender.map((slot, index) => (
          <div
            key={`${activeDay}-${index}`}
            className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end"
          >
            <div className="space-y-1.5">
              <Label className="text-xs">Início</Label>
              <Input
                type="time"
                value={slot.startTime}
                onChange={(e) =>
                  onChange(updateSlotOnDay(schedule, activeDay, index, 'startTime', e.target.value))
                }
                className="rounded-xl h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Fim</Label>
              <Input
                type="time"
                value={slot.endTime}
                onChange={(e) =>
                  onChange(updateSlotOnDay(schedule, activeDay, index, 'endTime', e.target.value))
                }
                className="rounded-xl h-9"
              />
            </div>
            {activeSlots.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-xl text-destructive h-9"
                onClick={() => onChange(removeSlotFromDay(schedule, activeDay, index))}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}

        {showMaxSlots && (
          <div className="space-y-1.5 pt-1">
            <Label>Máx. serviços/dia</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={schedule.maxSlotsPerDay}
              onChange={(e) => onChange(setMaxSlotsPerDay(schedule, e.target.value))}
              className="rounded-xl"
            />
          </div>
        )}
      </div>
    </div>
  );
}
