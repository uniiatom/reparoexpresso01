import React, { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Building2, Ban, MessageSquareWarning, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import CitiesNeighborhoodsTab from './CitiesNeighborhoodsTab';
import BlocklistTab from './BlocklistTab';
import CoverageRequestsTab from './CoverageRequestsTab';

const TABS = [
  { value: 'cidades',     label: 'Cidades & Bairros',    icon: Building2 },
  { value: 'negativacoes',label: 'Negativações',          icon: Ban },
  { value: 'chamados',    label: 'Chamados de Cobertura', icon: MessageSquareWarning, badge: 'pending' },
];

export default function AdminLocaisAtuacao() {
  const [searchParams, setSearchParams] = useSearchParams();
  const subtab = searchParams.get('subtab') ?? 'cidades';
  const [pendingCoverage, setPendingCoverage] = useState(0);

  const activeTab = TABS.find((t) => t.value === subtab)?.value ?? 'cidades';

  const handleTab = (value) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'locais-atuacao');
    if (value === 'cidades') next.delete('subtab'); else next.set('subtab', value);
    setSearchParams(next, { replace: true });
  };

  const handlePendingCount = useCallback((n) => setPendingCoverage(n), []);

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          Locais de Atuação
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Gerencie as cidades e bairros onde a empresa presta serviços, negativações temporárias
          e chamados de cobertura de clientes fora da área.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border/50 flex-wrap">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.value;
          const badgeCount = tab.badge === 'pending' ? pendingCoverage : 0;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => handleTab(tab.value)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {badgeCount > 0 && (
                <Badge className="text-[10px] h-4 min-w-4 px-1 bg-primary text-primary-foreground">
                  {badgeCount}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div>
        {activeTab === 'cidades' && <CitiesNeighborhoodsTab />}
        {activeTab === 'negativacoes' && <BlocklistTab />}
        {activeTab === 'chamados' && (
          <CoverageRequestsTab onPendingCountChange={handlePendingCount} />
        )}
      </div>
    </div>
  );
}
