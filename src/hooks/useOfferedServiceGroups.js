import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { DEFAULT_OFFERED_SERVICE_GROUPS } from '@/lib/offeredServiceGroups';

export function useOfferedServiceGroups({ includeInactive = false } = {}) {
  return useQuery({
    queryKey: ['offered-service-groups', includeInactive ? 'all' : 'active'],
    queryFn: async () => {
      try {
        const rows = await base44.entities.OfferedServiceGroup.list('sort_order', 100);
        const list = rows ?? [];
        if (list.length === 0) return DEFAULT_OFFERED_SERVICE_GROUPS;
        return includeInactive ? list : list.filter((g) => g.is_active !== false);
      } catch {
        return DEFAULT_OFFERED_SERVICE_GROUPS;
      }
    },
    staleTime: 60_000,
  });
}
