import React, { useMemo, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useOfferedServices } from '@/hooks/useOfferedServices';
import OfferedServiceCard from '@/components/offered-services/OfferedServiceCard';
import { cn } from '@/lib/utils';

export default function OfferedServicesCatalog({
  title = 'Catálogo de serviços',
  description = 'Serviços cadastrados pela administração.',
  variant = 'compact',
  group: controlledGroup,
  onGroupChange,
  hideGroupTabs = false,
  hideHeader = false,
  onServiceClick,
}) {
  const [internalGroup, setInternalGroup] = useState('casa');
  const [searchQuery, setSearchQuery] = useState('');
  const group = controlledGroup ?? internalGroup;
  const setGroup = onGroupChange ?? setInternalGroup;
  const isCardLayout = variant === 'cards';

  const { data: services = [], isLoading } = useOfferedServices(group);

  const filteredServices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return services;
    return services.filter((service) => {
      const haystack = [
        service.name,
        service.slug,
        service.description,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [services, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!hideHeader && (
        <div>
          <h3 className="text-lg font-bold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      )}

      {!hideGroupTabs && (
        <div className="flex gap-2">
          {[
            { id: 'casa', label: '🏠 Casa' },
            { id: 'veiculo', label: '🚗 Veículo' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setGroup(tab.id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
                group === tab.id
                  ? 'bg-amber-400/15 border-amber-400/40 text-amber-300'
                  : 'border-white/10 text-zinc-400 hover:text-zinc-200',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {isCardLayout && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Buscar serviço..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 rounded-xl"
            aria-label="Buscar serviço"
          />
          {searchQuery.trim() && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200"
              aria-label="Limpar busca"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {filteredServices.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          {searchQuery.trim()
            ? `Nenhum serviço encontrado para "${searchQuery.trim()}".`
            : 'Nenhum serviço cadastrado nesta categoria.'}
        </p>
      ) : (
        <div className={cn(
          'grid items-stretch',
          isCardLayout
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5'
            : 'grid-cols-1 sm:grid-cols-2 gap-3',
        )}>
          {filteredServices.map((service) => (
            <OfferedServiceCard
              key={service.id}
              service={service}
              showDescription={isCardLayout}
              compact={!isCardLayout}
              onClick={onServiceClick ? () => onServiceClick(service) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
