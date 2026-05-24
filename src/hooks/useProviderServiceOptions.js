import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { buildProviderServiceOptions } from '@/lib/offeredServices';

/**
 * Serviços disponíveis para configuração/cadastro de prestadores,
 * sincronizados com o catálogo "Serviços Prestados" do admin.
 */
export function useProviderServiceOptions({ includeInactive = false } = {}) {
  return useQuery({
    queryKey: ['provider-service-options', includeInactive ? 'all' : 'active'],
    queryFn: async () => {
      const rows = await base44.entities.OfferedService.list('sort_order', 300);
      let options = buildProviderServiceOptions(rows);
      if (!includeInactive) {
        options = options.filter((o) => o.isActive !== false);
      }
      return options;
    },
    staleTime: 60_000,
  });
}
