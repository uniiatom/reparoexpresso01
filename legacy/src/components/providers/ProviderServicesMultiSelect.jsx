import { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { groupProviderServices } from '@/lib/offeredServiceGroups';

export default function ProviderServicesMultiSelect({
  services = [],
  groups = [],
  selectedValues = [],
  onToggle,
  isLoading = false,
  emptyMessage = 'Nenhum serviço disponível no momento.',
  className,
  listClassName,
}) {
  const grouped = useMemo(() => groupProviderServices(services, groups), [services, groups]);
  const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues]);

  if (isLoading) {
    return (
      <div className={cn('flex justify-center py-8', className)}>
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <p className={cn('text-sm text-muted-foreground italic py-2', className)}>
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {grouped.map((group) => (
        <div key={group.key} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
            {group.label}
          </p>
          <ul
            className={cn(
              'flex flex-col rounded-xl border border-border/50 bg-card/30 overflow-hidden',
              'max-h-64 overflow-y-auto divide-y divide-border/40',
              listClassName,
            )}
            role="listbox"
            aria-multiselectable="true"
          >
            {group.items.map((svc) => {
              const checked = selectedSet.has(svc.value);
              return (
                <li key={svc.value}>
                  <label
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors',
                      checked
                        ? 'bg-primary/10 hover:bg-primary/15'
                        : 'hover:bg-primary/5',
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => onToggle(svc.value)}
                    />
                    <span className="text-sm font-medium text-foreground flex-1">
                      {svc.label}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        {selectedValues.length > 0
          ? `${selectedValues.length} serviço${selectedValues.length !== 1 ? 's' : ''} selecionado${selectedValues.length !== 1 ? 's' : ''}`
          : 'Selecione ao menos um serviço'}
      </p>
    </div>
  );
}
