import { WEEKDAYS } from '@/lib/constants/providerServiceTypes';

/** @typedef {{ startTime: string, endTime: string }} ScheduleSlot */
/** @typedef {{ maxSlotsPerDay: number|string, activeDay: number, byDay: Record<number, ScheduleSlot[]> }} ProviderSchedule */

export function createDefaultSchedule() {
  return {
    maxSlotsPerDay: 5,
    activeDay: 1,
    byDay: {
      1: [{ startTime: '08:00', endTime: '18:00' }],
    },
  };
}

/** Converte registros do banco em estrutura por dia. */
export function availabilityToSchedule(availabilities = []) {
  if (!availabilities.length) return createDefaultSchedule();

  /** @type {Record<number, ScheduleSlot[]>} */
  const byDay = {};
  for (const row of availabilities) {
    const day = row.day_of_week;
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push({
      startTime: String(row.start_time ?? '').slice(0, 5),
      endTime: String(row.end_time ?? '').slice(0, 5),
    });
  }

  const configuredDays = Object.keys(byDay)
    .map(Number)
    .sort((a, b) => a - b);

  return {
    maxSlotsPerDay: availabilities[0]?.max_slots_per_day ?? 5,
    activeDay: configuredDays[0] ?? 1,
    byDay,
  };
}

/** Gera payloads para provider_availability. */
export function scheduleToAvailabilityRecords(schedule, providerId) {
  const maxSlots = Number(schedule.maxSlotsPerDay) || 5;
  /** @type {Array<Record<string, unknown>>} */
  const records = [];

  for (const [dayStr, slots] of Object.entries(schedule.byDay ?? {})) {
    const day = Number(dayStr);
    for (const slot of slots ?? []) {
      if (slot.startTime && slot.endTime) {
        records.push({
          provider_id: providerId,
          day_of_week: day,
          start_time: slot.startTime,
          end_time: slot.endTime,
          is_available: true,
          max_slots_per_day: maxSlots,
        });
      }
    }
  }

  return records;
}

export function dayHasConfiguredSlots(slots = []) {
  return slots.some((s) => s.startTime && s.endTime);
}

export function validateSchedule(schedule) {
  const errors = [];
  const byDay = schedule?.byDay ?? {};
  const configuredDays = Object.entries(byDay).filter(([, slots]) =>
    (slots ?? []).some((s) => s.startTime || s.endTime),
  );

  if (!configuredDays.length) {
    errors.push('Configure ao menos um dia com horário de atendimento.');
    return errors;
  }

  for (const [dayStr, slots] of configuredDays) {
    const dayLabel = WEEKDAYS.find((d) => d.value === Number(dayStr))?.label ?? dayStr;
    (slots ?? []).forEach((slot, index) => {
      if (!slot.startTime || !slot.endTime) {
        errors.push(`Informe início e fim do intervalo ${index + 1} (${dayLabel}).`);
      } else if (slot.startTime >= slot.endTime) {
        errors.push(`Horário inválido em ${dayLabel}: o início deve ser antes do fim.`);
      }
    });
  }

  return errors;
}

/** Compatibilidade com formulários antigos (days + slots globais). */
export function normalizeSchedule(raw) {
  if (raw?.byDay && typeof raw.byDay === 'object') {
    return {
      maxSlotsPerDay: raw.maxSlotsPerDay ?? 5,
      activeDay: raw.activeDay ?? 1,
      byDay: raw.byDay,
    };
  }

  const byDay = {};
  const days = raw?.days ?? [];
  const slots = raw?.slots?.length
    ? raw.slots
    : raw?.startTime && raw?.endTime
      ? [{ startTime: raw.startTime, endTime: raw.endTime }]
      : [{ startTime: '08:00', endTime: '18:00' }];

  for (const day of days) {
    byDay[day] = slots.map((s) => ({ ...s }));
  }

  if (!Object.keys(byDay).length) {
    return createDefaultSchedule();
  }

  return {
    maxSlotsPerDay: raw?.maxSlotsPerDay ?? 5,
    activeDay: days[0] ?? 1,
    byDay,
  };
}

export function getSlotsForDay(schedule, day) {
  return schedule.byDay?.[day] ?? [];
}

export function setActiveDay(schedule, day) {
  const byDay = { ...schedule.byDay };
  if (!byDay[day]?.length) {
    byDay[day] = [{ startTime: '', endTime: '' }];
  }
  return { ...schedule, activeDay: day, byDay };
}

export function addSlotToDay(schedule, day) {
  const byDay = { ...schedule.byDay };
  byDay[day] = [...(byDay[day] ?? []), { startTime: '', endTime: '' }];
  return { ...schedule, byDay };
}

export function removeSlotFromDay(schedule, day, index) {
  const byDay = { ...schedule.byDay };
  const next = (byDay[day] ?? []).filter((_, i) => i !== index);
  if (next.length) {
    byDay[day] = next;
  } else {
    delete byDay[day];
  }
  return { ...schedule, byDay };
}

export function updateSlotOnDay(schedule, day, index, field, value) {
  const byDay = { ...schedule.byDay };
  const slots = [...(byDay[day] ?? [{ startTime: '', endTime: '' }])];
  slots[index] = { ...slots[index], [field]: value };
  byDay[day] = slots;
  return { ...schedule, byDay };
}

export function setMaxSlotsPerDay(schedule, value) {
  return { ...schedule, maxSlotsPerDay: value };
}
