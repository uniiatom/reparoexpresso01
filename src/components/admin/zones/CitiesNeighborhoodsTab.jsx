import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Loader2, Plus, Trash2, Pencil, ChevronDown, ChevronRight,
  MapPin, Building2, Check, X, Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Queries ──────────────────────────────────────────────────────────────────
const useCities = () =>
  useQuery({
    queryKey: ['admin-zone-cities'],
    queryFn: () => supabase.from('zone_cities').select('*').order('name').then(r => r.data ?? []),
  });

const useNeighborhoods = () =>
  useQuery({
    queryKey: ['admin-zone-neighborhoods'],
    queryFn: () => supabase.from('zone_neighborhoods').select('*').order('name').then(r => r.data ?? []),
  });

// ─── Formulário vazio ─────────────────────────────────────────────────────────
const EMPTY_CITY = {
  name: '', state: '', active: true, deliver_whole_city: false,
  city_delivery_fee: '', city_eta_minutes: '',
};
const EMPTY_NEIGH = {
  name: '', delivery_fee: '', eta_minutes: '',
  allow_immediate: true, allow_scheduled: true, active: true,
};

export default function CitiesNeighborhoodsTab() {
  const qc = useQueryClient();
  const { data: cities = [], isLoading: loadingCities } = useCities();
  const { data: allNeighborhoods = [], isLoading: loadingNeighborhoods } = useNeighborhoods();

  const [openCities, setOpenCities] = useState(new Set());
  const [citySearch, setCitySearch] = useState('');

  // City form
  const [cityForm, setCityForm] = useState(null); // null=fechado, {}=novo, {id,...}=edit
  const [neighForm, setNeighForm] = useState(null); // { cityId, ...data }

  // ── Filtered ───────────────────────────────────────────────────────────────
  const filteredCities = useMemo(() => {
    const q = citySearch.trim().toLowerCase();
    if (!q) return cities;
    return cities.filter((c) => c.name.toLowerCase().includes(q));
  }, [cities, citySearch]);

  const neighborhoodsByCity = useMemo(() => {
    const map = {};
    allNeighborhoods.forEach((n) => {
      if (!map[n.city_id]) map[n.city_id] = [];
      map[n.city_id].push(n);
    });
    return map;
  }, [allNeighborhoods]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const saveCity = useMutation({
    mutationFn: async (data) => {
      const payload = {
        name: data.name.trim(),
        state: data.state.trim().toUpperCase() || null,
        active: data.active,
        deliver_whole_city: data.deliver_whole_city,
        city_delivery_fee: data.city_delivery_fee === '' ? null : Number(data.city_delivery_fee),
        city_eta_minutes: data.city_eta_minutes === '' ? null : Number(data.city_eta_minutes),
      };
      if (data.id) {
        const { error } = await supabase.from('zone_cities').update(payload).eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('zone_cities').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-zone-cities'] });
      setCityForm(null);
      toast.success('Cidade salva!');
    },
    onError: (e) => toast.error(e.message || 'Erro ao salvar cidade.'),
  });

  const deleteCity = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('zone_cities').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-zone-cities'] });
      qc.invalidateQueries({ queryKey: ['admin-zone-neighborhoods'] });
      toast.success('Cidade removida.');
    },
    onError: (e) => toast.error(e.message || 'Erro ao remover cidade.'),
  });

  const toggleCityActive = useMutation({
    mutationFn: async ({ id, active }) => {
      const { error } = await supabase.from('zone_cities').update({ active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-zone-cities'] }),
    onError: (e) => toast.error(e.message),
  });

  const saveNeighborhood = useMutation({
    mutationFn: async (data) => {
      const payload = {
        city_id: data.cityId,
        name: data.name.trim(),
        delivery_fee: data.delivery_fee === '' ? null : Number(data.delivery_fee),
        eta_minutes: data.eta_minutes === '' ? null : Number(data.eta_minutes),
        allow_immediate: data.allow_immediate,
        allow_scheduled: data.allow_scheduled,
        active: data.active,
      };
      if (data.id) {
        const { error } = await supabase.from('zone_neighborhoods').update(payload).eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('zone_neighborhoods').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-zone-neighborhoods'] });
      setNeighForm(null);
      toast.success('Bairro salvo!');
    },
    onError: (e) => toast.error(e.message || 'Erro ao salvar bairro.'),
  });

  const deleteNeighborhood = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('zone_neighborhoods').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-zone-neighborhoods'] });
      toast.success('Bairro removido.');
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleNeighActive = useMutation({
    mutationFn: async ({ id, active }) => {
      const { error } = await supabase.from('zone_neighborhoods').update({ active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-zone-neighborhoods'] }),
  });

  // ── Handlers ───────────────────────────────────────────────────────────────
  const toggleCityOpen = (id) => {
    setOpenCities((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const submitCity = () => {
    if (!cityForm?.name?.trim()) { toast.error('Informe o nome da cidade.'); return; }
    saveCity.mutate(cityForm);
  };

  const submitNeighborhood = () => {
    if (!neighForm?.name?.trim()) { toast.error('Informe o nome do bairro.'); return; }
    saveNeighborhood.mutate(neighForm);
  };

  if (loadingCities || loadingNeighborhoods) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cidade…"
            value={citySearch}
            onChange={(e) => setCitySearch(e.target.value)}
            className="pl-9 rounded-xl"
          />
        </div>
        <Button
          className="rounded-xl gap-2 shrink-0"
          onClick={() => setCityForm({ ...EMPTY_CITY })}
        >
          <Plus className="w-4 h-4" /> Nova cidade
        </Button>
      </div>

      {/* Form de cidade */}
      {cityForm && (
        <CityForm
          data={cityForm}
          onChange={setCityForm}
          onSave={submitCity}
          onCancel={() => setCityForm(null)}
          saving={saveCity.isPending}
        />
      )}

      {/* Lista de cidades */}
      {filteredCities.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {citySearch ? 'Nenhuma cidade encontrada.' : 'Nenhuma cidade cadastrada ainda.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredCities.map((city) => {
            const isOpen = openCities.has(city.id);
            const neighborhoods = neighborhoodsByCity[city.id] ?? [];
            return (
              <Collapsible
                key={city.id}
                open={isOpen}
                onOpenChange={() => toggleCityOpen(city.id)}
              >
                <div className={cn(
                  'border rounded-xl overflow-hidden transition-colors',
                  city.active ? 'border-border/50' : 'border-border/20 opacity-60',
                )}>
                  {/* City row */}
                  <div className="flex items-center gap-2 p-3 bg-card/60">
                    <CollapsibleTrigger asChild>
                      <button className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                        {isOpen
                          ? <ChevronDown className="w-4 h-4" />
                          : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </CollapsibleTrigger>
                    <Building2 className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{city.name}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {city.state && (
                          <span className="text-xs text-muted-foreground">{city.state}</span>
                        )}
                        {city.deliver_whole_city && (
                          <Badge variant="outline" className="text-[10px] h-4 text-emerald-600 border-emerald-400/40">
                            Cidade inteira
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {neighborhoods.length} bairro{neighborhoods.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <Switch
                      checked={city.active}
                      onCheckedChange={(v) => toggleCityActive.mutate({ id: city.id, active: v })}
                      className="scale-75"
                    />
                    <Button
                      size="icon" variant="ghost" className="h-7 w-7 shrink-0"
                      onClick={() => setCityForm({ ...city, city_delivery_fee: city.city_delivery_fee ?? '', city_eta_minutes: city.city_eta_minutes ?? '' })}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon" variant="ghost" className="h-7 w-7 text-destructive shrink-0"
                      onClick={() => {
                        if (window.confirm(`Remover "${city.name}"? Todos os bairros serão removidos.`)) {
                          deleteCity.mutate(city.id);
                        }
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {/* Bairros */}
                  <CollapsibleContent>
                    <div className="border-t border-border/30 bg-muted/10 p-3 space-y-2">
                      {/* Form de bairro */}
                      {neighForm?.cityId === city.id && (
                        <NeighborhoodForm
                          data={neighForm}
                          onChange={setNeighForm}
                          onSave={submitNeighborhood}
                          onCancel={() => setNeighForm(null)}
                          saving={saveNeighborhood.isPending}
                        />
                      )}

                      {/* Lista de bairros */}
                      {neighborhoods.length === 0 && !neighForm && (
                        <p className="text-xs text-muted-foreground italic py-1">
                          Nenhum bairro cadastrado.
                          {city.deliver_whole_city && ' (Cidade inteira — bairros são opcionais)'}
                        </p>
                      )}

                      {neighborhoods.map((neigh) => (
                        <div
                          key={neigh.id}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-lg border',
                            neigh.active ? 'border-border/30 bg-card/40' : 'border-border/10 opacity-50',
                          )}
                        >
                          <MapPin className="w-3.5 h-3.5 text-primary/60 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{neigh.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {neigh.delivery_fee != null ? `R$ ${Number(neigh.delivery_fee).toFixed(2)}` : 'Taxa padrão'}
                              {neigh.eta_minutes ? ` · ${neigh.eta_minutes} min` : ''}
                              {!neigh.allow_immediate && ' · Sem imediato'}
                              {!neigh.allow_scheduled && ' · Sem agendado'}
                            </p>
                          </div>
                          <Switch
                            checked={neigh.active}
                            onCheckedChange={(v) => toggleNeighActive.mutate({ id: neigh.id, active: v })}
                            className="scale-[0.65]"
                          />
                          <Button
                            size="icon" variant="ghost" className="h-6 w-6 shrink-0"
                            onClick={() => setNeighForm({ ...neigh, cityId: city.id, delivery_fee: neigh.delivery_fee ?? '', eta_minutes: neigh.eta_minutes ?? '' })}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            size="icon" variant="ghost" className="h-6 w-6 text-destructive shrink-0"
                            onClick={() => deleteNeighborhood.mutate(neigh.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}

                      <Button
                        size="sm" variant="outline"
                        className="rounded-xl gap-1.5 h-7 text-xs w-full mt-1"
                        onClick={() => {
                          setNeighForm({ ...EMPTY_NEIGH, cityId: city.id });
                          setOpenCities((prev) => new Set([...prev, city.id]));
                        }}
                      >
                        <Plus className="w-3 h-3" /> Adicionar bairro
                      </Button>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Sub-form: Cidade ──────────────────────────────────────────────────────────
function CityForm({ data, onChange, onSave, onCancel, saving }) {
  const set = (k, v) => onChange((p) => ({ ...p, [k]: v }));
  return (
    <div className="border border-primary/20 rounded-xl p-4 space-y-3 bg-primary/5">
      <p className="text-sm font-semibold">{data.id ? 'Editar cidade' : 'Nova cidade'}</p>
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 space-y-1.5">
          <Label className="text-xs">Nome da cidade *</Label>
          <Input value={data.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex: São Paulo" className="rounded-xl h-9" autoFocus />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">UF</Label>
          <Input value={data.state} onChange={(e) => set('state', e.target.value.toUpperCase().slice(0, 2))} placeholder="SP" maxLength={2} className="rounded-xl h-9" />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Taxa de deslocamento (R$)</Label>
          <Input type="number" min="0" step="0.01" value={data.city_delivery_fee} onChange={(e) => set('city_delivery_fee', e.target.value)} placeholder="0,00" className="rounded-xl h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Tempo estimado (min)</Label>
          <Input type="number" min="0" value={data.city_eta_minutes} onChange={(e) => set('city_eta_minutes', e.target.value)} placeholder="Ex: 30" className="rounded-xl h-9" />
        </div>
      </div>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <Switch checked={data.active} onCheckedChange={(v) => set('active', v)} />
          Cidade ativa
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <Switch checked={data.deliver_whole_city} onCheckedChange={(v) => set('deliver_whole_city', v)} />
          <span>Atende cidade inteira <span className="text-xs text-muted-foreground">(sem precisar de bairro cadastrado)</span></span>
        </label>
      </div>
      <div className="flex gap-2">
        <Button size="sm" className="rounded-xl" onClick={onSave} disabled={saving}>
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
          Salvar cidade
        </Button>
        <Button size="sm" variant="ghost" className="rounded-xl" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
}

// ── Sub-form: Bairro ──────────────────────────────────────────────────────────
function NeighborhoodForm({ data, onChange, onSave, onCancel, saving }) {
  const set = (k, v) => onChange((p) => ({ ...p, [k]: v }));
  return (
    <div className="border border-primary/20 rounded-xl p-3 space-y-3 bg-primary/5">
      <p className="text-xs font-semibold">{data.id ? 'Editar bairro' : 'Novo bairro'}</p>
      <div className="grid sm:grid-cols-3 gap-2">
        <div className="sm:col-span-3 space-y-1">
          <Label className="text-xs">Nome do bairro *</Label>
          <Input value={data.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex: Centro" className="rounded-xl h-8 text-sm" autoFocus />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Taxa de deslocamento (R$)</Label>
          <Input type="number" min="0" step="0.01" value={data.delivery_fee} onChange={(e) => set('delivery_fee', e.target.value)} placeholder="Padrão cidade" className="rounded-xl h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Tempo estimado (min)</Label>
          <Input type="number" min="0" value={data.eta_minutes} onChange={(e) => set('eta_minutes', e.target.value)} placeholder="Padrão cidade" className="rounded-xl h-8 text-sm" />
        </div>
      </div>
      <div className="flex flex-wrap gap-3 text-xs">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <Switch checked={data.allow_immediate} onCheckedChange={(v) => set('allow_immediate', v)} className="scale-[0.7]" />
          Atendimento imediato
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <Switch checked={data.allow_scheduled} onCheckedChange={(v) => set('allow_scheduled', v)} className="scale-[0.7]" />
          Agendamento futuro
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <Switch checked={data.active} onCheckedChange={(v) => set('active', v)} className="scale-[0.7]" />
          Bairro ativo
        </label>
      </div>
      <div className="flex gap-2">
        <Button size="sm" className="rounded-xl h-7 text-xs" onClick={onSave} disabled={saving}>
          {saving && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
          Salvar bairro
        </Button>
        <Button size="sm" variant="ghost" className="rounded-xl h-7 text-xs" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
}
