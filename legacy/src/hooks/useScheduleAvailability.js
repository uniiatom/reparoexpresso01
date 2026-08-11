import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, getDay } from 'date-fns';

export function useScheduleAvailability(providerId, selectedDate) {
  const { data: availability = [] } = useQuery({
    queryKey: ['provider-availability', providerId],
    queryFn: () => base44.entities.ProviderAvailability.filter({ provider_id: providerId }),
    enabled: !!providerId,
  });

  const { data: bookedServices = [] } = useQuery({
    queryKey: ['provider-booked', providerId, selectedDate],
    queryFn: async () => {
      const services = await base44.entities.ServiceRequest.filter({
        provider_id: providerId,
      });
      const ACTIVE_STATUSES = ['agendado', 'aceito', 'a_caminho', 'em_andamento'];
      return services.filter(s => 
        s.scheduled_date && 
        ACTIVE_STATUSES.includes(s.status) &&
        format(new Date(s.scheduled_date + 'T12:00:00'), 'yyyy-MM-dd') === selectedDate
      ) || [];
    },
    enabled: !!providerId && !!selectedDate,
  });

  const getDayAvailability = (date) => {
    if (!date) return null;
    const dayOfWeek = getDay(new Date(date + 'T00:00:00'));
    return availability.find(a => a.day_of_week === dayOfWeek && a.is_available);
  };

  const isTimeAvailable = (date, time) => {
    const dayAvailability = getDayAvailability(date);
    if (!dayAvailability) return false;

    const timeNum = parseInt(time.replace(':', ''));
    const startNum = parseInt(dayAvailability.start_time.replace(':', ''));
    const endNum = parseInt(dayAvailability.end_time.replace(':', ''));

    if (timeNum < startNum || timeNum >= endNum) return false;

    const dateStr = format(new Date(date + 'T00:00:00'), 'yyyy-MM-dd');
    const bookedCount = bookedServices.filter(s => s.scheduled_time === time).length;
    const totalBooked = bookedServices.length;

    return bookedCount === 0 && totalBooked < (dayAvailability.max_slots_per_day || 5);
  };

  return {
    availability,
    bookedServices,
    getDayAvailability,
    isTimeAvailable,
  };
}