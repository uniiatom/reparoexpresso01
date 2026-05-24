import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, Ban, Building2, MapPin, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const SCOPE_LABELS = {
  city: { label: 'Cidade', icon: Building2 },
  neighborhood: { label: 'Bairro', icon: MapPin },
};

export default function BlocklistTab() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ scope: 'city', city_id: '', neighborhood_id: '', reason: '' });

  const { data: blocklist = [], isLoading: loadingBlock } = useQuery({
    queryKey: ['admin-zone-blocklist'],
    queryFn: async () => {
      const { data } = await supabase
        .from('zone_blocklist')
        .select(`
          *,
          zone_cities!zone_blocklist_city_id_fkey(name),
          zone_neighborhoods!zone_blocklist_neighborhood_id_fkey(name)
        `)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  const { data: cities = [] } = useQuery({
    queryKey: ['admin-zone-cities'],
    queryFn: () => supabase.from('zone_cities').select('id, name').eq('active', true).order('name').then(r => r.data ?? []),
  });

  const { data: neighborhoods = [] } = useQuery({
    queryKey: ['admin-zone-neighborhoods-for-block'],
    queryFn: () => supabase.from('zone_neighborhoods').select('id, name, city_id').eq('active', true).order('name').then(r => r.data ?? []),
    enabled: draft.scope === 'neighborhood',
  });

  const filteredNeighborhoods = neighborhoods.filter((n) => !draft.city_id || n.city_id === draft.city_id);

  const addBlock = useMutation({
    mutationFn: async () => {
      const payload = { scope: draft.scope, reason: draft.reason.trim() || null };
      if (draft.scope === 'city') {
        if (!draft.city_id) throw new Error('Selecione a cidade.');
        payload.city_id = draft.city_id;
      } else {
        if (!draft.neighborhood_id) throw new Error('Selecione o bairro.');
        payload.neighborhood_id = draft.neighborhood_id;
        if (draft.city_id) payload.city_id = draft.city_id;
      }
      const { error } = await supabase.from('zone_blocklist').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-zone-blocklist'] });
      setDraft({ scope: 'city', city_id: '', neighborhood_id: '', reason: '' });
      setShowForm(false);
      toast.success('Negativação adicionada.');
    },
    onError: (e) => toast.error(e.message || 'Erro ao negativar.'),
  });

  const removeBlock = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('zone_blocklist').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-zone-blocklist'] });
      toast.success('Negativação removida.');
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Regiões marcadas aqui são exibidas como <strong>indisponíveis</strong> para o cliente,
            sem remover o cadastro permanentemente.
          </p>
        </div>
        <Button className="rounded-xl gap-2 shrink-0" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> Negativar região
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="border border-destructive/20 rounded-xl p-4 space-y-3 bg-destructive/5">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-4 h-4" />
            <p className="text-sm font-semibold">Negativar região</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Escopo</Label>
              <Select
                value={draft.scope}
                onValueChange={(v) => setDraft((p) => ({ ...p, scope: v, city_id: '', neighborhood_id: '' }))}
              >
                <SelectTrigger className="rounded-xl h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="city">Cidade inteira</SelectItem>
                  <SelectItem value="neighborhood">Bairro específico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cidade</Label>
              <Select
                value={draft.city_id}
                onValueChange={(v) => setDraft((p) => ({ ...p, city_id: v, neighborhood_id: '' }))}
              >
                <SelectTrigger className="rounded-xl h-9"><SelectValue placeholder="Selecionar…" /></SelectTrigger>
                <SelectContent>
                  {cities.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {draft.scope === 'neighborhood' && (
              <div className="space-y-1.5">
                <Label className="text-xs">Bairro</Label>
                <Select
                  value={draft.neighborhood_id}
                  onValueChange={(v) => setDraft((p) => ({ ...p, neighborhood_id: v }))}
                >
                  <SelectTrigger className="rounded-xl h-9"><SelectValue placeholder="Selecionar…" /></SelectTrigger>
                  <SelectContent>
                    {filteredNeighborhoods.map((n) => <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Motivo (opcional)</Label>
            <Input
              value={draft.reason}
              onChange={(e) => setDraft((p) => ({ ...p, reason: e.target.value }))}
              placeholder="Ex: Área de risco temporária, Obra na via…"
              className="rounded-xl h-9"
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="rounded-xl bg-destructive hover:bg-destructive/90 text-white"
              onClick={() => addBlock.mutate()}
              disabled={addBlock.isPending}
            >
              {addBlock.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              Confirmar negativação
            </Button>
            <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Lista */}
      {loadingBlock ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : blocklist.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Nenhuma negativação ativa.
        </div>
      ) : (
        <div className="space-y-2">
          {blocklist.map((block) => {
            const meta = SCOPE_LABELS[block.scope];
            const Icon = meta?.icon ?? Ban;
            const cityName = block.zone_cities?.name ?? '—';
            const neighName = block.zone_neighborhoods?.name;
            return (
              <div
                key={block.id}
                className="flex items-center gap-3 p-3 border border-destructive/20 rounded-xl bg-destructive/5"
              >
                <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30 h-4">
                      {meta?.label}
                    </Badge>
                    <span className="text-sm font-medium">
                      {neighName ? `${neighName} — ${cityName}` : cityName}
                    </span>
                  </div>
                  {block.reason && (
                    <p className="text-xs text-muted-foreground mt-0.5">{block.reason}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl text-xs gap-1.5 shrink-0 border-destructive/30 text-destructive hover:bg-destructive/5"
                  onClick={() => removeBlock.mutate(block.id)}
                  disabled={removeBlock.isPending}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Desbloquear
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
