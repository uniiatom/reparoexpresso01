import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, FileText, PlusCircle, Users } from 'lucide-react';
import { logAdminAction } from '@/lib/adminLog';
import ProviderRegistrationForm from '@/components/providers/ProviderRegistrationForm';
import { parseServiceOfferings } from '@/lib/providerRegistration';

export default function AdminProvidersPanel({
  providers,
  adminUser,
  onSelectProvider,
  onApprove,
  onBlock,
}) {
  const queryClient = useQueryClient();
  const [view, setView] = useState('list');

  const visibleProviders = providers.filter((p) => !p.is_blocked && !p.is_rejected);

  const handleCreated = (provider) => {
    queryClient.invalidateQueries({ queryKey: ['all-providers'] });
    queryClient.invalidateQueries({ queryKey: ['sidebar-providers'] });
    logAdminAction({
      action: 'provider_created',
      actorName: adminUser?.full_name || 'Admin',
      actorEmail: adminUser?.email || '',
      entityType: 'Provider',
      entityId: provider.id,
      entityLabel: provider.name,
    });
    setView('list');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Prestadores de serviço
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cadastre prestadores com qualificações, serviços, horários e preço por hora.
          </p>
        </div>
        <Button
          size="sm"
          className="rounded-xl gap-1.5"
          onClick={() => setView((v) => (v === 'create' ? 'list' : 'create'))}
        >
          {view === 'create' ? (
            'Ver lista'
          ) : (
            <><PlusCircle className="w-4 h-4" /> Cadastrar prestador</>
          )}
        </Button>
      </div>

      {view === 'create' ? (
        <ProviderRegistrationForm
          mode="admin"
          onSuccess={handleCreated}
          onCancel={() => setView('list')}
        />
      ) : (
        <div className="space-y-3">
          {visibleProviders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Nenhum prestador cadastrado. Clique em &quot;Cadastrar prestador&quot; para começar.
              </CardContent>
            </Card>
          ) : (
            visibleProviders.map((prov) => {
              const offerings = parseServiceOfferings(prov);
              return (
                <Card key={prov.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="font-bold text-primary">{prov.name?.charAt(0)}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground">{prov.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {prov.city} · {prov.phone}
                          </p>
                          {prov.address && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {prov.address}
                            </p>
                          )}
                          {offerings.length > 0 && (
                            <p className="text-xs text-primary/80 mt-1">
                              {offerings.slice(0, 3).map((o) => `${o.label}: R$ ${o.hourly_rate}/h`).join(' · ')}
                              {offerings.length > 3 ? '…' : ''}
                            </p>
                          )}
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {prov.is_approved
                              ? <Badge className="bg-green-100 text-green-800 border-0 text-xs">Aprovado</Badge>
                              : <Badge className="bg-yellow-100 text-yellow-800 border-0 text-xs">Pendente</Badge>}
                            {prov.is_online && (
                              <Badge className="bg-primary/10 text-primary border-0 text-xs">Online</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => onSelectProvider(prov)}
                        >
                          <FileText className="w-4 h-4 mr-1" /> Ver ficha
                        </Button>
                        {!prov.is_approved && (
                          <>
                            <Button
                              size="sm"
                              className="rounded-xl bg-green-600 text-white hover:bg-green-700"
                              onClick={() => onApprove(prov.id, prov.name)}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" /> Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl text-destructive border-destructive/30 hover:bg-destructive/5"
                              onClick={() => onSelectProvider(prov)}
                            >
                              <XCircle className="w-4 h-4 mr-1" /> Reprovar
                            </Button>
                          </>
                        )}
                        {prov.is_approved && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl text-destructive border-destructive/30"
                            onClick={() => onBlock(prov.id, prov.name)}
                          >
                            <XCircle className="w-4 h-4 mr-1" /> Bloquear
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
