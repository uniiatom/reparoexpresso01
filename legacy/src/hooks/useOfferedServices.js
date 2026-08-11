import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useOfferedServices(serviceGroup) {
  return useQuery({
    queryKey: ['offered-services', serviceGroup ?? 'all'],
    queryFn: async () => {
      const all = await base44.entities.OfferedService.filter(
        { is_active: true },
        'sort_order',
        200,
      );
      if (!serviceGroup) return all;
      return all.filter((s) => s.service_group === serviceGroup);
    },
    staleTime: 60_000,
  });
}

export function useOfferedServiceFieldTemplates() {
  return useQuery({
    queryKey: ['offered-service-field-templates'],
    queryFn: () => base44.entities.OfferedServiceFieldTemplate.filter({}, 'sort_order', 100),
    staleTime: 60_000,
  });
}
