import React, { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle2, XCircle, FileText, PlusCircle, Users, Settings, Pencil, Search } from 'lucide-react';
import { logAdminAction } from '@/lib/adminLog';
import ProviderRegistrationForm from '@/components/providers/ProviderRegistrationForm';
import ProviderSettings from '@/components/admin/ProviderSettings';
import { parseServiceOfferings } from '@/lib/providerRegistration';

function buildProviderSearchHaystack(provider) {
  const offerings = parseServiceOfferings(provider);
  const statusLabels = [
    provider.is_approved ? 'aprovado' : 'pendente',
    provider.is_blocked ? 'bloqueado' : null,
    provider.is_rejected ? 'reprovado rejeitado' : null,
    provider.is_online ? 'online' : 'offline',
  ].filter(Boolean);

  return [
    provider.name,
    provider.phone,
    provider.email,
    provider.cpf,
    provider.rg,
    provider.address,
    provider.neighborhood,
    provider.city,
    provider.state,
    provider.zip_code,
    provider.bio,
    ...(provider.specialties ?? []),
    ...offerings.map((o) => o.label),
    ...offerings.map((o) => o.service_type),
    ...statusLabels,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function matchesProviderSearch(provider, rawQuery) {
  const query = rawQuery.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (!query) return true;

  const haystack = buildProviderSearchHaystack(provider);
  const tokens = query.split(/\s+/).filter(Boolean);
  const phoneDigits = query.replace(/\D/g, '');

  return tokens.every((token) => {
    if (haystack.includes(token)) return true;
    if (phoneDigits.length >= 4 && provider.phone?.replace(/\D/g, '').includes(phoneDigits)) return true;
    return false;
  });
}

function getProviderStatusBadges(prov) {
  const badges = [];
  if (prov.is_blocked) {
    badges.push({ key: 'blocked', label: 'Bloqueado', className: 'bg-red-100 text-red-800 border-0 text-xs' });
  } else if (prov.is_rejected) {
    badges.push({ key: 'rejected', label: 'Reprovado', className: 'bg-orange-100 text-orange-800 border-0 text-xs' });
  } else if (prov.is_approved) {
    badges.push({ key: 'approved', label: 'Aprovado', className: 'bg-green-100 text-green-800 border-0 text-xs' });
  } else {
    badges.push({ key: 'pending', label: 'Pendente', className: 'bg-yellow-100 text-yellow-800 border-0 text-xs' });
  }
  if (prov.is_online) {
    badges.push({ key: 'online', label: 'Online', className: 'bg-primary/10 text-primary border-0 text-xs' });
  }
  return badges;
}

export default function AdminProvidersPanel({
  providers,
  adminUser,
  onSelectProvider,
  onApprove,
  onBlock,
  editProvider = null,
  onEditComplete,
}) {
  const queryClient = useQueryClient();
  const [view, setView] = useState('list');
  const [showSettings, setShowSettings] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProviders = useMemo(() => {
    const q = searchQuery.trim();
    const baseList = q
      ? providers
      : providers.filter((p) => !p.is_blocked && !p.is_rejected);
    if (!q) return baseList;
    return baseList.filter((p) => matchesProviderSearch(p, q));
  }, [providers, searchQuery]);

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

  const handleUpdated = (provider) => {
    queryClient.invalidateQueries({ queryKey: ['all-providers'] });
    queryClient.invalidateQueries({ queryKey: ['sidebar-providers'] });
    logAdminAction({
      action: 'provider_updated',
      actorName: adminUser?.full_name || 'Admin',
      actorEmail: adminUser?.email || '',
      entityType: 'Provider',
      entityId: provider.id,
      entityLabel: provider.name,
    });
    setEditingProvider(null);
    setView('list');
    onEditComplete?.();
  };

  const startEdit = (provider) => {
    setEditingProvider(provider);
    setView('edit');
  };

  useEffect(() => {
    if (editProvider?.id) {
      startEdit(editProvider);
    }
  }, [editProvider?.id]);

  return (
    <div className="space-y-4">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Prestadores de serviço
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cadastre e gerencie prestadores. Configure serviços, horários e regiões nas ⚙️ Configurações.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl gap-1.5"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="w-4 h-4" /> Configurações
          </Button>
          <Button
            size="sm"
            className="rounded-xl gap-1.5"
            onClick={() => {
              if (view === 'list') {
                setEditingProvider(null);
                setView('create');
              } else {
                setEditingProvider(null);
                setView('list');
              }
            }}
          >
            {view === 'list' ? (
              <><PlusCircle className="w-4 h-4" /> Cadastrar prestador</>
            ) : (
              'Ver lista'
            )}
          </Button>
        </div>
      </div>

      {/* ── Modal de configurações ──────────────────────────────────────── */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto card-glass border-primary/20">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Configurações de Prestadores
            </DialogTitle>
          </DialogHeader>
          <ProviderSettings onClose={() => setShowSettings(false)} />
        </DialogContent>
      </Dialog>

      {/* ── Conteúdo ────────────────────────────────────────────────────── */}
      {view === 'create' ? (
        <ProviderRegistrationForm
          mode="admin"
          onSuccess={handleCreated}
          onCancel={() => setView('list')}
        />
      ) : view === 'edit' && editingProvider ? (
        <ProviderRegistrationForm
          mode="admin"
          provider={editingProvider}
          onSuccess={handleUpdated}
          onCancel={() => {
            setEditingProvider(null);
            setView('list');
            onEditComplete?.();
          }}
        />
      ) : (
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                placeholder="Buscar por nome, telefone, e-mail, endereço, serviço, status (aprovado, pendente, online…)…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 rounded-xl border-white/10 bg-zinc-900/40"
                aria-label="Buscar prestador"
              />
              {searchQuery.trim() && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 transition-colors"
                  aria-label="Limpar busca"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground px-1">
              {searchQuery.trim()
                ? `${filteredProviders.length} resultado${filteredProviders.length === 1 ? '' : 's'} para "${searchQuery.trim()}"`
                : `${filteredProviders.length} prestador${filteredProviders.length === 1 ? '' : 'es'} ativo${filteredProviders.length === 1 ? '' : 's'}`}
              {searchQuery.trim() && ' · inclui bloqueados/reprovados se corresponderem à busca'}
            </p>
          </div>

          {providers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Nenhum prestador cadastrado. Clique em &quot;Cadastrar prestador&quot; para começar.
              </CardContent>
            </Card>
          ) : filteredProviders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground space-y-3">
                <Search className="w-8 h-8 mx-auto text-zinc-600" />
                <p>Nenhum prestador encontrado para &quot;{searchQuery.trim()}&quot;.</p>
                <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setSearchQuery('')}>
                  Limpar busca
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredProviders.map((prov) => {
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
                              {offerings.slice(0, 3).map((o) => o.label).join(' · ')}
                              {offerings.length > 3 ? '…' : ''}
                            </p>
                          )}
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {getProviderStatusBadges(prov).map((badge) => (
                              <Badge key={badge.key} className={badge.className}>{badge.label}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => startEdit(prov)}
                        >
                          <Pencil className="w-4 h-4 mr-1" /> Editar
                        </Button>
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
