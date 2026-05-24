import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  Loader2, Plus, Trash2, Settings,
  CalendarDays, MapPin, Link2, Copy,
  ExternalLink, Type, AlignLeft, Hash, FileUp,
  Pencil, Layers, Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { REGISTRATION_FIELDS, WEEKDAYS } from '@/lib/constants/providerServiceTypes';
import { cn } from '@/lib/utils';
import { useProviderServiceOptions } from '@/hooks/useProviderServiceOptions';
import { useOfferedServiceGroups } from '@/hooks/useOfferedServiceGroups';
import ProviderServicesMultiSelect from '@/components/providers/ProviderServicesMultiSelect';

// ─── Tipos de campos personalizados ──────────────────────────────────────────
const CUSTOM_FIELD_TYPES = [
  { value: 'text',     label: 'Texto curto',   Icon: Type },
  { value: 'textarea', label: 'Parágrafo',      Icon: AlignLeft },
  { value: 'number',   label: 'Número',         Icon: Hash },
  { value: 'file',     label: 'Arquivo / Foto', Icon: FileUp },
];

// ─── Config padrão ────────────────────────────────────────────────────────────
const DEFAULT_CONFIG = {
  required_fields: [],
  allowed_services: [],
  allowed_weekdays: [0, 1, 2, 3, 4, 5, 6],
  allowed_hours_start: '07:00',
  allowed_hours_end: '20:00',
  allowed_regions: [],
  allowed_day_schedules: {},
  custom_registration_fields: [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function migrateToSchedules(savedConfig) {
  const existing = savedConfig.allowed_day_schedules;
  if (existing && Object.keys(existing).length > 0) return existing;
  if (savedConfig.allowed_weekdays?.length > 0) {
    const schedule = {};
    savedConfig.allowed_weekdays.forEach((d) => {
      schedule[String(d)] = [{
        start: savedConfig.allowed_hours_start || '07:00',
        end:   savedConfig.allowed_hours_end   || '20:00',
      }];
    });
    return schedule;
  }
  return {};
}

function slugifyLabel(label) {
  return label
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function FieldTypeIcon({ type, className }) {
  const entry = CUSTOM_FIELD_TYPES.find((t) => t.value === type);
  const Icon = entry?.Icon ?? Type;
  return <Icon className={cn('w-3.5 h-3.5', className)} />;
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function ProviderSettings({ onClose }) {
  const queryClient = useQueryClient();
  const [, setSearchParams] = useSearchParams();

  // ── Config ─────────────────────────────────────────────────────────────────
  const { data: savedConfig, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['provider-config'],
    queryFn: async () => {
      const list = await base44.entities.ProviderConfig.list();
      return list[0] || DEFAULT_CONFIG;
    },
  });

  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [daySchedules, setDaySchedules] = useState({});

  useEffect(() => {
    if (savedConfig) {
      setConfig({ ...DEFAULT_CONFIG, ...savedConfig });
      setDaySchedules(migrateToSchedules(savedConfig));
    }
  }, [savedConfig]);

  const saveConfig = useMutation({
    mutationFn: async (patch) => {
      const next = { ...config, ...patch };
      if (savedConfig?.id) {
        return base44.entities.ProviderConfig.update(savedConfig.id, next);
      }
      return base44.entities.ProviderConfig.create(next);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-config'] });
      toast.success('Configurações salvas!');
    },
    onError: () => toast.error('Erro ao salvar.'),
  });

  // ── Serviços ativos (catálogo) ─────────────────────────────────────────────
  const { data: catalogServiceOptions = [], isLoading: isLoadingServiceOptions } = useProviderServiceOptions();
  const { data: serviceGroups = [] } = useOfferedServiceGroups();
  const activeCount = catalogServiceOptions.filter((s) => s.isActive !== false).length;

  const toggleAllowedService = (slug) => {
    const current = config.allowed_services ?? [];
    const next = current.includes(slug)
      ? current.filter((s) => s !== slug)
      : [...current, slug];
    setConfig((p) => ({ ...p, allowed_services: next }));
  };

  // ── Campos personalizados ───────────────────────────────────────────────────
  const customFields = config.custom_registration_fields ?? [];
  const [showFieldForm, setShowFieldForm] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState(null);
  const [fieldDraft, setFieldDraft] = useState({ label: '', field_type: 'text', is_required: false });

  const openNewField = () => {
    setFieldDraft({ label: '', field_type: 'text', is_required: false });
    setEditingFieldId(null);
    setShowFieldForm(true);
  };

  const openEditField = (field) => {
    setFieldDraft({ label: field.label, field_type: field.field_type, is_required: !!field.is_required });
    setEditingFieldId(field.id);
    setShowFieldForm(true);
  };

  const cancelField = () => { setShowFieldForm(false); setEditingFieldId(null); };

  const commitField = () => {
    if (!fieldDraft.label.trim()) { toast.error('Informe o nome do campo.'); return; }
    let next;
    if (editingFieldId) {
      next = customFields.map((f) => f.id === editingFieldId ? { ...f, ...fieldDraft } : f);
    } else {
      const id = `${slugifyLabel(fieldDraft.label)}_${Date.now()}`;
      next = [...customFields, { id, sort_order: customFields.length, ...fieldDraft }];
    }
    setConfig((p) => ({ ...p, custom_registration_fields: next }));
    saveConfig.mutate({ custom_registration_fields: next });
    cancelField();
  };

  const deleteCustomField = (id) => {
    const next = customFields.filter((f) => f.id !== id);
    setConfig((p) => ({ ...p, custom_registration_fields: next }));
    saveConfig.mutate({ custom_registration_fields: next });
  };

  // ── Horários por dia ────────────────────────────────────────────────────────
  const isDayEnabled = (dayValue) => String(dayValue) in daySchedules;

  const toggleDay = (dayValue) => {
    const key = String(dayValue);
    setDaySchedules((prev) => {
      const next = { ...prev };
      if (key in next) { delete next[key]; } else { next[key] = []; }
      return next;
    });
  };

  const addSlot = (dayValue) => {
    const key = String(dayValue);
    setDaySchedules((prev) => ({
      ...prev,
      [key]: [...(prev[key] ?? []), { start: '08:00', end: '18:00' }],
    }));
  };

  const updateSlot = (dayValue, idx, patch) => {
    const key = String(dayValue);
    setDaySchedules((prev) => {
      const slots = [...(prev[key] ?? [])];
      slots[idx] = { ...slots[idx], ...patch };
      return { ...prev, [key]: slots };
    });
  };

  const removeSlot = (dayValue, idx) => {
    const key = String(dayValue);
    setDaySchedules((prev) => ({
      ...prev,
      [key]: (prev[key] ?? []).filter((_, i) => i !== idx),
    }));
  };

  const saveSchedules = () => {
    for (const slots of Object.values(daySchedules)) {
      for (const slot of slots) {
        if (slot.start && slot.end && slot.end <= slot.start) {
          toast.error('Intervalo com horário final igual ou anterior ao início. Corrija antes de salvar.');
          return;
        }
      }
    }
    saveConfig.mutate({ allowed_day_schedules: daySchedules });
  };

  const totalSlots = Object.values(daySchedules).reduce((acc, s) => acc + s.length, 0);
  const activeDays = Object.keys(daySchedules).length;

  // ── Regiões (zone-based) ────────────────────────────────────────────────────
  const [regionSearch, setRegionSearch] = useState('');

  const { data: zoneCities = [] } = useQuery({
    queryKey: ['zone-cities-active'],
    queryFn: async () => {
      const { data } = await supabase.from('zone_cities').select('id, name').eq('active', true).order('name');
      return data ?? [];
    },
  });

  const { data: zoneNeighborhoods = [] } = useQuery({
    queryKey: ['zone-neighborhoods-active'],
    queryFn: async () => {
      const { data } = await supabase
        .from('zone_neighborhoods').select('id, name, city_id').eq('active', true).order('name');
      return data ?? [];
    },
  });

  const neighborhoodsByCity = useMemo(() => {
    const map = {};
    zoneNeighborhoods.forEach((n) => {
      if (!map[n.city_id]) map[n.city_id] = [];
      map[n.city_id].push(n);
    });
    return map;
  }, [zoneNeighborhoods]);

  const filteredCities = useMemo(() => {
    const q = regionSearch.toLowerCase();
    if (!q) return zoneCities;
    return zoneCities.filter((c) => {
      const cityMatch = c.name.toLowerCase().includes(q);
      const neighMatch = (neighborhoodsByCity[c.id] ?? []).some((n) => n.name.toLowerCase().includes(q));
      return cityMatch || neighMatch;
    });
  }, [zoneCities, neighborhoodsByCity, regionSearch]);

  const selectedRegions = config.allowed_regions ?? [];

  const toggleNeighborhood = (neighId) => {
    const next = selectedRegions.includes(neighId)
      ? selectedRegions.filter((id) => id !== neighId)
      : [...selectedRegions, neighId];
    setConfig((p) => ({ ...p, allowed_regions: next }));
  };

  const toggleAllCity = (cityId) => {
    const cityNeighs = (neighborhoodsByCity[cityId] ?? []).map((n) => n.id);
    const allSelected = cityNeighs.length > 0 && cityNeighs.every((id) => selectedRegions.includes(id));
    const next = allSelected
      ? selectedRegions.filter((id) => !cityNeighs.includes(id))
      : [...new Set([...selectedRegions, ...cityNeighs])];
    setConfig((p) => ({ ...p, allowed_regions: next }));
  };

  const copyLink = () => {
    const url = `${window.location.origin}/cadastro-prestador`;
    navigator.clipboard.writeText(url).then(
      () => toast.success('Link copiado!'),
      () => toast.error('URL: ' + url),
    );
  };

  if (isLoadingConfig) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ══ CAMPOS OBRIGATÓRIOS ══════════════════════════════════════════════ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" /> Campos Obrigatórios no Cadastro
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Configure quais campos o prestador deve preencher ao se cadastrar.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Campos fixos */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Campos padrão</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {REGISTRATION_FIELDS.map((field) => (
                <label
                  key={field.id}
                  className="flex items-center gap-2 p-3 border border-border/50 rounded-xl cursor-pointer bg-card/40 hover:bg-primary/5 hover:border-primary/30 transition-all"
                >
                  <Checkbox
                    checked={config.required_fields?.includes(field.id)}
                    onCheckedChange={() => {
                      const current = config.required_fields ?? [];
                      const next = current.includes(field.id)
                        ? current.filter((id) => id !== field.id)
                        : [...current, field.id];
                      setConfig((p) => ({ ...p, required_fields: next }));
                    }}
                  />
                  <span className="text-sm font-medium">{field.label}</span>
                </label>
              ))}
            </div>
            <Button
              size="sm"
              className="rounded-xl"
              onClick={() => saveConfig.mutate({ required_fields: config.required_fields })}
              disabled={saveConfig.isPending}
            >
              {saveConfig.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Salvar campos padrão
            </Button>
          </div>

          {/* Campos personalizados */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Campos personalizados
              </p>
              {!showFieldForm && (
                <Button size="sm" variant="outline" className="rounded-xl gap-1.5 h-7 text-xs" onClick={openNewField}>
                  <Plus className="w-3 h-3" /> Novo campo
                </Button>
              )}
            </div>

            {customFields.length > 0 && (
              <div className="space-y-2">
                {customFields.map((field) => (
                  <div key={field.id} className="flex items-center gap-2 p-3 border border-border/50 rounded-xl bg-card/40">
                    <FieldTypeIcon type={field.field_type} className="text-primary shrink-0" />
                    <span className="text-sm font-medium flex-1 truncate">{field.label}</span>
                    {field.is_required && (
                      <Badge variant="outline" className="text-[10px] text-primary border-primary/30 shrink-0 h-5 px-1.5">
                        Obrigatório
                      </Badge>
                    )}
                    <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => openEditField(field)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive shrink-0" onClick={() => deleteCustomField(field.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {customFields.length === 0 && !showFieldForm && (
              <p className="text-sm text-muted-foreground italic">Nenhum campo personalizado cadastrado ainda.</p>
            )}

            {showFieldForm && (
              <div className="border border-primary/20 rounded-xl p-4 space-y-3 bg-primary/5">
                <p className="text-sm font-semibold">
                  {editingFieldId ? 'Editar campo' : 'Novo campo personalizado'}
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nome do campo *</Label>
                    <Input
                      value={fieldDraft.label}
                      onChange={(e) => setFieldDraft((p) => ({ ...p, label: e.target.value }))}
                      placeholder="Ex: Registro CREA, Foto do veículo…"
                      className="rounded-xl h-9"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === 'Enter') commitField(); }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tipo</Label>
                    <Select value={fieldDraft.field_type} onValueChange={(v) => setFieldDraft((p) => ({ ...p, field_type: v }))}>
                      <SelectTrigger className="rounded-xl h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CUSTOM_FIELD_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <Switch
                    checked={fieldDraft.is_required}
                    onCheckedChange={(v) => setFieldDraft((p) => ({ ...p, is_required: v }))}
                  />
                  Obrigatório no cadastro
                </label>
                <div className="flex gap-2">
                  <Button size="sm" className="rounded-xl" onClick={commitField} disabled={saveConfig.isPending}>
                    {saveConfig.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                    Salvar campo
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-xl" onClick={cancelField}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ══ SERVIÇOS DISPONÍVEIS ═════════════════════════════════════════════ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" /> Serviços Disponíveis
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Escolha quais serviços do catálogo aparecem no cadastro do prestador. Se nenhum estiver marcado, todos os ativos ficam disponíveis.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProviderServicesMultiSelect
            services={catalogServiceOptions}
            groups={serviceGroups}
            selectedValues={config.allowed_services ?? []}
            onToggle={toggleAllowedService}
            isLoading={isLoadingServiceOptions}
            emptyMessage="Nenhum serviço no catálogo. Cadastre em Serviços Prestados."
            listClassName="max-h-72"
          />
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <p className="text-xs text-muted-foreground flex-1">
              {activeCount > 0
                ? `${activeCount} serviço${activeCount !== 1 ? 's' : ''} ativo${activeCount !== 1 ? 's' : ''} no catálogo.`
                : 'Nenhum serviço cadastrado ainda.'}
            </p>
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl"
                onClick={() => setConfig((p) => ({ ...p, allowed_services: [] }))}
              >
                Liberar todos
              </Button>
              <Button
                size="sm"
                className="rounded-xl"
                onClick={() => saveConfig.mutate({ allowed_services: config.allowed_services ?? [] })}
                disabled={saveConfig.isPending}
              >
                {saveConfig.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Salvar serviços
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl gap-2"
                onClick={() => {
                  onClose?.();
                  setSearchParams({ tab: 'servicos-prestados' });
                }}
              >
                <ExternalLink className="w-4 h-4" />
                Gerenciar catálogo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ══ HORÁRIOS POR DIA ═════════════════════════════════════════════════ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" /> Horários de Atendimento por Dia
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Ative os dias e defina intervalos de horário. Cada dia pode ter múltiplos intervalos.
            Clique num chip para editar ou remover.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">

          <div className="overflow-x-auto -mx-1 px-1 pb-1">
            <div className="grid grid-cols-7 gap-1.5 min-w-[420px]">
              {WEEKDAYS.map((day) => {
                const key = String(day.value);
                const enabled = isDayEnabled(day.value);
                const slots = daySchedules[key] ?? [];

                return (
                  <div
                    key={day.value}
                    className={cn(
                      'rounded-xl border flex flex-col transition-all duration-200',
                      enabled
                        ? 'border-primary/30 bg-primary/5'
                        : 'border-border/40 bg-card/20',
                    )}
                  >
                    {/* Header do dia */}
                    <div className="flex flex-col items-center gap-1 px-1 pt-2.5 pb-1.5">
                      <span className={cn(
                        'text-[11px] font-bold',
                        enabled ? 'text-primary' : 'text-muted-foreground',
                      )}>
                        {day.label}
                      </span>
                      <Switch
                        checked={enabled}
                        onCheckedChange={() => toggleDay(day.value)}
                        className="scale-[0.7] origin-center"
                      />
                    </div>

                    {enabled ? (
                      <div className="flex flex-col gap-1 px-1 pb-1.5 flex-1">
                        {slots.map((slot, idx) => (
                          <Popover key={idx}>
                            <PopoverTrigger asChild>
                              <button className="w-full text-center text-[10px] font-semibold bg-primary/15 hover:bg-primary/25 active:scale-95 text-primary border border-primary/25 rounded-lg px-0.5 py-1.5 transition-all leading-tight">
                                {slot.start}
                                <span className="block text-[8px] text-primary/50 leading-none my-0.5">→</span>
                                {slot.end}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-52 p-3 space-y-3" side="bottom" align="center" sideOffset={6}>
                              <p className="text-xs font-semibold text-foreground">
                                {day.label} — intervalo {idx + 1}
                              </p>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-xs">Início</Label>
                                  <Input
                                    type="time"
                                    value={slot.start}
                                    onChange={(e) => updateSlot(day.value, idx, { start: e.target.value })}
                                    className="rounded-lg h-8 text-xs px-2"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Fim</Label>
                                  <Input
                                    type="time"
                                    value={slot.end}
                                    onChange={(e) => updateSlot(day.value, idx, { end: e.target.value })}
                                    className="rounded-lg h-8 text-xs px-2"
                                  />
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="w-full text-destructive hover:bg-destructive/5 h-7 text-xs rounded-lg"
                                onClick={() => removeSlot(day.value, idx)}
                              >
                                <Trash2 className="w-3 h-3 mr-1" /> Remover intervalo
                              </Button>
                            </PopoverContent>
                          </Popover>
                        ))}

                        <button
                          type="button"
                          onClick={() => addSlot(day.value)}
                          className="w-full mt-auto text-[10px] text-primary/50 hover:text-primary border border-dashed border-primary/20 hover:border-primary/50 rounded-lg py-1.5 transition-colors"
                          title={`Adicionar intervalo — ${day.label}`}
                        >
                          <Plus className="w-2.5 h-2.5 mx-auto" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1 min-h-[48px]" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Button size="sm" className="rounded-xl" onClick={saveSchedules} disabled={saveConfig.isPending}>
              {saveConfig.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Salvar horários
            </Button>
            <p className="text-xs text-muted-foreground">
              {activeDays} dia{activeDays !== 1 ? 's' : ''} ativo{activeDays !== 1 ? 's' : ''}
              {' · '}
              {totalSlots} intervalo{totalSlots !== 1 ? 's' : ''} configurado{totalSlots !== 1 ? 's' : ''}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ══ REGIÕES DE ATUAÇÃO ═══════════════════════════════════════════════ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" /> Regiões de Atuação
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Selecione os bairros disponíveis para o prestador. Se nenhum selecionado, o campo fica livre.
            Gerencie cidades e bairros em{' '}
            <button
              type="button"
              className="text-primary underline-offset-2 hover:underline"
              onClick={() => { onClose?.(); setSearchParams({ tab: 'locais-atuacao' }); }}
            >
              Locais de Atuação
            </button>.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">

          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar cidade ou bairro…"
              value={regionSearch}
              onChange={(e) => setRegionSearch(e.target.value)}
              className="rounded-xl pl-9"
            />
          </div>

          {/* Lista */}
          {zoneCities.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              Nenhuma cidade cadastrada ainda.{' '}
              <button
                type="button"
                className="text-primary hover:underline inline-flex items-center gap-1"
                onClick={() => { onClose?.(); setSearchParams({ tab: 'locais-atuacao' }); }}
              >
                Cadastrar agora <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          ) : filteredCities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum resultado para &quot;{regionSearch}&quot;.
            </p>
          ) : (
            <div className="divide-y divide-border/50 border border-border/50 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
              {filteredCities.map((city) => {
                const cityNeighs = (neighborhoodsByCity[city.id] ?? []).filter((n) => {
                  const q = regionSearch.toLowerCase();
                  if (!q) return true;
                  return (
                    n.name.toLowerCase().includes(q) ||
                    city.name.toLowerCase().includes(q)
                  );
                });
                const allSelected =
                  cityNeighs.length > 0 &&
                  cityNeighs.every((n) => selectedRegions.includes(n.id));
                const someSelected = cityNeighs.some((n) => selectedRegions.includes(n.id));
                const selectedCount = cityNeighs.filter((n) => selectedRegions.includes(n.id)).length;

                return (
                  <div key={city.id}>
                    {/* Cabeçalho da cidade */}
                    <div
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 cursor-pointer select-none',
                        someSelected ? 'bg-primary/5' : 'bg-muted/30',
                      )}
                      onClick={() => toggleAllCity(city.id)}
                    >
                      <Checkbox
                        checked={allSelected}
                        data-state={someSelected && !allSelected ? 'indeterminate' : undefined}
                        onCheckedChange={() => toggleAllCity(city.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="text-xs font-semibold flex-1">{city.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {selectedCount}/{cityNeighs.length}
                      </span>
                    </div>

                    {/* Bairros */}
                    {cityNeighs.length > 0 ? (
                      <div className="divide-y divide-border/20">
                        {cityNeighs.map((neigh) => (
                          <label
                            key={neigh.id}
                            className="flex items-center gap-2 px-5 py-2 cursor-pointer hover:bg-primary/5 transition-colors"
                          >
                            <Checkbox
                              checked={selectedRegions.includes(neigh.id)}
                              onCheckedChange={() => toggleNeighborhood(neigh.id)}
                            />
                            <span className="text-sm">{neigh.name}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground px-5 py-2 italic">
                        Nenhum bairro cadastrado.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Rodapé */}
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              size="sm"
              className="rounded-xl"
              onClick={() => saveConfig.mutate({ allowed_regions: selectedRegions })}
              disabled={saveConfig.isPending}
            >
              {saveConfig.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Salvar regiões
            </Button>
            {selectedRegions.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {selectedRegions.length} bairro{selectedRegions.length !== 1 ? 's' : ''} selecionado{selectedRegions.length !== 1 ? 's' : ''}
              </p>
            )}
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl gap-1.5 ml-auto"
              onClick={() => { onClose?.(); setSearchParams({ tab: 'locais-atuacao' }); }}
            >
              <ExternalLink className="w-3.5 h-3.5" /> Gerenciar cidades
            </Button>
          </div>

        </CardContent>
      </Card>

      {/* ══ LINK DE CADASTRO ═════════════════════════════════════════════════ */}
      <Card className="card-glow">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary" /> Link de Cadastro do Prestador
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Compartilhe este link para que o prestador preencha os próprios dados.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 bg-black/30 border border-primary/20 rounded-xl px-4 py-3 font-mono text-sm text-primary/70 break-all shadow-inner">
            {typeof window !== 'undefined' ? `${window.location.origin}/cadastro-prestador` : '/cadastro-prestador'}
          </div>
          <Button className="rounded-xl gap-2 w-full sm:w-auto" onClick={copyLink}>
            <Copy className="w-4 h-4" /> Copiar link de cadastro
          </Button>
        </CardContent>
      </Card>

    </div>
  );
}
