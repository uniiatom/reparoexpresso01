import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Ban, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

export default function ClientBlacklist() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [blacklistModal, setBlacklistModal] = useState(null);
  const [reason, setReason] = useState('');

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['all-clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const blacklistClient = useMutation({
    mutationFn: ({ clientId, reason }) =>
      base44.entities.Client.update(clientId, {
        is_blacklisted: true,
        blacklist_reason: reason,
        blacklisted_at: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-clients'] });
      toast.success('Cliente adicionado à blacklist');
      setBlacklistModal(null);
      setReason('');
    },
  });

  const removeFromBlacklist = useMutation({
    mutationFn: (clientId) =>
      base44.entities.Client.update(clientId, {
        is_blacklisted: false,
        blacklist_reason: null,
        blacklisted_at: null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-clients'] });
      toast.success('Cliente removido da blacklist');
    },
  });

  const blacklistedClients = clients.filter(c => c.is_blacklisted);
  const regularClients = clients.filter(c => !c.is_blacklisted);

  const filteredRegular = regularClients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    c.cpf?.includes(search)
  );

  const filteredBlacklisted = blacklistedClients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    c.cpf?.includes(search)
  );

  if (isLoading) {
    return <div className="text-center py-10 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{regularClients.length}</p>
            <p className="text-xs text-muted-foreground">Clientes ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-destructive">{blacklistedClients.length}</p>
            <p className="text-xs text-muted-foreground">Na blacklist</p>
          </CardContent>
        </Card>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, telefone ou CPF..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Blacklisted */}
      {filteredBlacklisted.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <Ban className="w-4 h-4 text-destructive" />
            Clientes Bloqueados ({filteredBlacklisted.length})
          </h3>
          <div className="space-y-2">
            {filteredBlacklisted.map(client => (
              <Card key={client.id} className="border-destructive/30">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{client.name}</p>
                      <p className="text-sm text-muted-foreground">{client.phone}</p>
                      {client.cpf && <p className="text-xs text-muted-foreground">CPF: {client.cpf}</p>}
                      {client.blacklist_reason && (
                        <div className="mt-2 bg-destructive/10 border border-destructive/20 rounded-lg p-2">
                          <p className="text-xs font-semibold text-destructive">Motivo:</p>
                          <p className="text-xs text-destructive/80">{client.blacklist_reason}</p>
                        </div>
                      )}
                      {client.blacklisted_at && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Bloqueado em {new Date(client.blacklisted_at).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg text-xs whitespace-nowrap"
                      onClick={() => removeFromBlacklist.mutate(client.id)}
                      disabled={removeFromBlacklist.isPending}
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> Remover
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Active clients */}
      {filteredRegular.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-bold text-foreground">Clientes Ativos ({filteredRegular.length})</h3>
          <div className="space-y-2">
            {filteredRegular.map(client => (
              <Card key={client.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{client.name}</p>
                      <p className="text-sm text-muted-foreground">{client.phone}</p>
                      {client.cpf && <p className="text-xs text-muted-foreground">CPF: {client.cpf}</p>}
                    </div>
                    <Button
                      size="sm"
                      className="rounded-lg text-xs bg-destructive hover:bg-destructive/90 text-white whitespace-nowrap"
                      onClick={() => setBlacklistModal(client)}
                    >
                      <Ban className="w-3 h-3 mr-1" /> Bloquear
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {search && filteredRegular.length === 0 && filteredBlacklisted.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">Nenhum cliente encontrado</div>
      )}

      {/* Blacklist Modal */}
      {blacklistModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-2">
          <div className="bg-card w-full max-w-md rounded-3xl shadow-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Bloquear Cliente</h2>
              <button
                onClick={() => {
                  setBlacklistModal(null);
                  setReason('');
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4">
              <p className="font-semibold text-foreground">{blacklistModal.name}</p>
              <p className="text-sm text-muted-foreground">{blacklistModal.phone}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Motivo do bloqueio</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: Cliente não compareceu em 3 serviços agendados, cancelamentos frequentes, etc."
                className="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => {
                  setBlacklistModal(null);
                  setReason('');
                }}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 rounded-xl bg-destructive hover:bg-destructive/90 text-white"
                onClick={() => {
                  if (!reason.trim()) {
                    toast.error('Informe o motivo do bloqueio');
                    return;
                  }
                  blacklistClient.mutate({
                    clientId: blacklistModal.id,
                    reason: reason.trim(),
                  });
                }}
                disabled={blacklistClient.isPending || !reason.trim()}
              >
                <Ban className="w-4 h-4 mr-1" /> Bloquear
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}