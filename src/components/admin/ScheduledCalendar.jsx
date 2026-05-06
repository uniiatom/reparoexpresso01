import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Calendar, User, Wrench, X, ArrowRight, Search } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const SERVICE_LABELS = {
  eletrica: "Elétrica", hidraulica: "Hidráulica", pintura: "Pintura",
  reparo_geral: "Reparo Geral", montagem: "Montagem", alvenaria: "Alvenaria",
  fechadura: "Fechadura", ar_condicionado: "Ar Cond.",
  limpeza_caixa_dagua: "Caixa D'água", limpeza_calha: "Calha",
  desentupimento: "Desentup.", reboque: "Reboque", outros: "Outros",
};

const STATUS_BG = {
  agendado: 'bg-blue-50 border-blue-300 text-blue-800',
  aguardando: 'bg-yellow-50 border-yellow-300 text-yellow-800',
  aceito: 'bg-emerald-50 border-emerald-400 text-emerald-800',
  a_caminho: 'bg-sky-50 border-sky-300 text-sky-800',
  em_andamento: 'bg-purple-50 border-purple-300 text-purple-800',
  concluido: 'bg-green-50 border-green-300 text-green-800',
  cancelado: 'bg-red-50 border-red-300 text-red-600',
};

const STATUS_DOT = {
  agendado: 'bg-blue-500',
  aguardando: 'bg-yellow-500',
  aceito: 'bg-emerald-500',
  a_caminho: 'bg-sky-500',
  em_andamento: 'bg-purple-500',
  concluido: 'bg-green-500',
  cancelado: 'bg-red-400',
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function getServiceHour(s) {
  if (s.scheduled_time) {
    const h = parseInt(s.scheduled_time.split(':')[0], 10);
    return isNaN(h) ? null : h;
  }
  return null;
}

function getServiceDateKey(s) {
  if (s.scheduled_date) return s.scheduled_date;
  // Serviços imediatos ativos: usa a data de hoje
  if (['aceito', 'a_caminho', 'em_andamento', 'aguardando'].includes(s.status)) {
    return new Date().toISOString().slice(0, 10);
  }
  return null;
}

// Modal para ver detalhes e redirecionar serviço
function ServiceDetailModal({ service, providers, onClose, onUpdate }) {
  const [newDate, setNewDate] = useState(service.scheduled_date || '');
  const [newTime, setNewTime] = useState(service.scheduled_time || '');
  const [newProviderId, setNewProviderId] = useState(service.provider_id || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const provider = providers.find(p => p.id === newProviderId);
    await onUpdate(service.id, {
      scheduled_date: newDate || null,
      scheduled_time: newTime || null,
      provider_id: newProviderId || null,
      provider_name: provider?.name || service.provider_name,
      provider_phone: provider?.phone || service.provider_phone,
      status: service.status === 'aguardando' && newProviderId ? 'agendado' : service.status,
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <Card className="w-full max-w-md" onClick={e => e.stopPropagation()}>
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">{SERVICE_LABELS[service.service_type] || service.service_type}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">#{service.service_number || service.id.slice(-6)}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-xl p-3 space-y-1 text-sm">
            <p><span className="text-muted-foreground">Cliente:</span> <span className="font-medium">{service.client_name}</span></p>
            <p><span className="text-muted-foreground">Telefone:</span> {service.client_phone || '—'}</p>
            <p><span className="text-muted-foreground">Endereço:</span> {service.address}{service.city ? `, ${service.city}` : ''}</p>
            <p><span className="text-muted-foreground">Status:</span>
              <span className={cn('ml-1 px-2 py-0.5 rounded text-xs font-medium border', STATUS_BG[service.status])}>
                {service.status}
              </span>
            </p>
            {service.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">{service.description}</p>
            )}
          </div>

          {/* Prestador atual */}
          {service.provider_name && (
            <div className="flex items-center gap-2 text-sm bg-primary/5 border border-primary/20 rounded-xl p-3">
              <User className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">Prestador atual:</span>
              <span className="font-semibold text-foreground">{service.provider_name}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Data</label>
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Horário</label>
              <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1 flex items-center gap-1">
              <ArrowRight className="w-3 h-3 text-primary" /> Redirecionar para prestador
            </label>
            <select value={newProviderId} onChange={e => setNewProviderId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Sem prestador</option>
              {providers.filter(p => p.is_approved && !p.is_blocked).map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.is_online ? ' 🟢' : ''} — {p.specialties?.join(', ') || 'Geral'}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>Cancelar</Button>
            <Button className="flex-1 rounded-xl" onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ScheduledCalendar() {
  const queryClient = useQueryClient();
  const [currentDay, setCurrentDay] = useState(new Date());
  const [selectedService, setSelectedService] = useState(null);
  const [providerSearch, setProviderSearch] = useState('');
  const gridRef = useRef(null);

  const days = [currentDay, addDays(currentDay, 1), addDays(currentDay, 2)];

  const { data: services = [] } = useQuery({
    queryKey: ['scheduled-calendar-services'],
    queryFn: async () => {
      // Busca diretamente pelos status ativos — evita o problema de limit/paginação
      const statuses = ['aguardando', 'aceito', 'a_caminho', 'em_andamento', 'agendado'];
      const results = await Promise.all(
        statuses.map(s => base44.entities.ServiceRequest.filter({ status: s }, '-created_date', 200).catch(() => []))
      );
      const all = results.flat();
      // Deduplicar por id
      const unique = Array.from(new Map(all.map(s => [s.id, s])).values());
      console.log('[ScheduledCalendar] Active services fetched:', unique.length);
      return unique;
    },
    refetchInterval: 30000,
  });

  const { data: allProviders = [] } = useQuery({
    queryKey: ['all-providers-cal'],
    queryFn: () => base44.entities.Provider.list(),
  });

  const updateService = useMutation({
    mutationFn: ({ id, updates }) => base44.entities.ServiceRequest.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-calendar-services'] });
      toast.success('Serviço atualizado');
    },
    onError: () => toast.error('Erro ao atualizar serviço'),
  });

  const handleServiceUpdate = async (id, updates) => {
    await updateService.mutateAsync({ id, updates });
  };

  // Prestadores aprovados, filtrados pela busca
  const providers = useMemo(() => {
    const approved = allProviders.filter(p => p.is_approved && !p.is_blocked && !p.is_archived);
    if (!providerSearch.trim()) return approved;
    return approved.filter(p => p.name?.toLowerCase().includes(providerSearch.toLowerCase()));
  }, [allProviders, providerSearch]);

  const dayKeys = useMemo(() => days.map(d => format(d, 'yyyy-MM-dd')), [days]);

  // Serviços dos 3 dias por prestador e hora
  // serviceMap[providerId][dayKey][hour] = [service, ...]
  const serviceMap = useMemo(() => {
    const map = {};
    // Inclui IDs de todos os prestadores + IDs dos serviços que têm prestador + '__none__'
    const serviceProviderIds = services.map(s => s.provider_id).filter(Boolean);
    const allKeys = [...new Set([...allProviders.map(p => p.id), ...serviceProviderIds, '__none__'])];
    allKeys.forEach(key => {
      map[key] = {};
      dayKeys.forEach(dk => {
        map[key][dk] = {};
        HOURS.forEach(h => { map[key][dk][h] = []; });
        map[key][dk]['none'] = [];
      });
    });
    // Preenche serviços
    const approvedProviderIds = new Set(allProviders.filter(p => p.is_approved && !p.is_blocked && !p.is_archived).map(p => p.id));
    services.forEach(s => {
      const dateKey = getServiceDateKey(s);
      if (!dateKey) return;
      if (!dayKeys.includes(dateKey)) return;
      // Se o prestador existe mas não está na lista de aprovados visíveis, vai para __none__
      const provKey = (s.provider_id && approvedProviderIds.has(s.provider_id)) ? s.provider_id : '__none__';
      const hour = getServiceHour(s);
      if (hour !== null) {
        map[provKey][dateKey][hour].push(s);
      } else {
        map[provKey][dateKey]['none'].push(s);
      }
    });
    return map;
  }, [services, allProviders, dayKeys]);

  // Serviços sem prestador (ou com prestador não aprovado) nos 3 dias
  const approvedProviderIdSet = useMemo(() =>
    new Set(allProviders.filter(p => p.is_approved && !p.is_blocked && !p.is_archived).map(p => p.id)),
    [allProviders]
  );

  const unassignedServices = useMemo(() =>
    services.filter(s =>
      (!s.provider_id || !approvedProviderIdSet.has(s.provider_id)) &&
      dayKeys.includes(getServiceDateKey(s))
    ),
    [services, dayKeys, approvedProviderIdSet]
  );

  // Serviços novos (aguardando, sem prestador, sem data agendada)
  const newServices = useMemo(() =>
    services.filter(s => s.status === 'aguardando' && !s.provider_id && !s.scheduled_date),
    [services]
  );

  // Verifica se há serviços sem prestador nos 3 dias para mostrar coluna
  const hasUnassignedInDays = useMemo(() =>
    dayKeys.some(dk =>
      HOURS.some(h => serviceMap['__none__']?.[dk]?.[h]?.length > 0) ||
      serviceMap['__none__']?.[dk]?.['none']?.length > 0
    ), [serviceMap, dayKeys]);

  // Scroll para hora atual ao montar
  useEffect(() => {
    if (gridRef.current) {
      const currentHour = new Date().getHours();
      const rowHeight = 44;
      gridRef.current.scrollTop = Math.max(0, (currentHour - 1) * rowHeight);
    }
  }, []);

  const totalColWidth = providers.length > 0
    ? Math.max(120, Math.floor(800 / providers.length))
    : 200;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Agenda dos Prestadores
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {providers.length} prestador(es) · {services.length} serviço(s) ativo(s)
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="icon" className="rounded-xl h-8 w-8"
            onClick={() => setCurrentDay(d => addDays(d, -3))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-semibold min-w-[160px] text-center">
            {format(days[0], "dd/MM")} – {format(days[2], "dd/MM/yyyy")}
          </span>
          <Button variant="outline" size="sm" className="rounded-xl text-xs"
            onClick={() => setCurrentDay(new Date())}>
            Hoje
          </Button>
          <Button variant="outline" size="icon" className="rounded-xl h-8 w-8"
            onClick={() => setCurrentDay(d => addDays(d, 3))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Busca de prestador */}
      <div className="flex items-center gap-2 bg-muted/40 border border-border rounded-xl px-3 py-2">
        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <input
          type="text"
          placeholder="Filtrar prestador..."
          value={providerSearch}
          onChange={e => setProviderSearch(e.target.value)}
          className="bg-transparent text-sm focus:outline-none flex-1 text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(STATUS_DOT).map(([status, dot]) => (
          <div key={status} className="flex items-center gap-1">
            <span className={cn('w-2 h-2 rounded-full', dot)} />
            <span className="text-muted-foreground capitalize">{status.replace(/_/g, ' ')}</span>
          </div>
        ))}
      </div>

      {/* Serviços NOVOS (sem data agendada) */}
      {newServices.length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
          <p className="text-xs font-bold text-red-700 mb-3">
            🆕 {newServices.length} NOVO(S) SERVIÇO(S) — Abrir e redirecionar para prestador
          </p>
          <div className="flex flex-wrap gap-2">
            {newServices.map(s => (
              <button key={s.id}
                onClick={() => setSelectedService(s)}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-100 border border-red-400 text-red-800 rounded-lg text-xs font-bold hover:bg-red-200 transition-colors">
                <Wrench className="w-4 h-4" />
                {SERVICE_LABELS[s.service_type] || s.service_type} · {s.client_name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Serviços sem prestador (com data agendada) */}
      {unassignedServices.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
          <p className="text-xs font-bold text-yellow-800 mb-2">
            ⚠️ {unassignedServices.length} serviço(s) sem prestador alocado — clique para redirecionar
          </p>
          <div className="flex flex-wrap gap-2">
            {unassignedServices.map(s => (
              <button key={s.id}
                onClick={() => setSelectedService(s)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded-lg text-xs font-medium hover:bg-yellow-200 transition-colors">
                <Wrench className="w-3 h-3" />
                {SERVICE_LABELS[s.service_type] || s.service_type} · {s.client_name}
                <span className="text-[10px] opacity-70">· {getServiceDateKey(s)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grade: hora × prestador (por dia) */}
      {providers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Nenhum prestador aprovado encontrado
        </div>
      ) : (
        <div className="space-y-6">
          {days.map(day => {
            const dayKey = format(day, 'yyyy-MM-dd');
            return (
              <div key={dayKey} className="bg-card border border-border rounded-2xl overflow-hidden">
                {/* Cabeçalho do dia */}
                <div className={cn(
                  'px-4 py-2 border-b border-border flex items-center gap-3',
                  isToday(day) ? 'bg-primary/10' : 'bg-muted/30'
                )}>
                  <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center font-extrabold text-sm',
                    isToday(day) ? 'bg-primary text-white' : 'bg-border text-foreground')}>
                    {format(day, 'd')}
                  </div>
                  <div>
                    <p className={cn('text-sm font-bold capitalize', isToday(day) ? 'text-primary' : 'text-foreground')}>
                      {format(day, "EEEE", { locale: ptBR })}{isToday(day) ? ' — Hoje' : ''}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{format(day, "dd 'de' MMMM yyyy", { locale: ptBR })}</p>
                  </div>
                </div>

                {/* Scroll horizontal: prestadores como colunas */}
                <div className="overflow-x-auto">
                  <div style={{ minWidth: `${52 + providers.length * totalColWidth}px` }}>
                    {/* Header prestadores */}
                    <div className="flex border-b border-border sticky top-0 bg-card z-10">
                      <div className="w-[52px] flex-shrink-0 border-r border-border py-2" />
                      {/* Coluna sem prestador */}
                      {hasUnassignedInDays && (
                        <div style={{ width: totalColWidth }}
                          className="flex-shrink-0 border-r border-border px-2 py-2 text-center bg-yellow-50">
                          <div className="flex items-center justify-center gap-1 mb-0.5">
                            <div className="w-6 h-6 rounded-full bg-yellow-200 flex items-center justify-center">
                              <Wrench className="w-3 h-3 text-yellow-700" />
                            </div>
                          </div>
                          <p className="text-[10px] font-bold text-yellow-800">Sem Prestador</p>
                          <p className="text-[9px] text-yellow-600">Aguardando</p>
                        </div>
                      )}
                      {providers.map(p => (
                        <div key={p.id}
                          style={{ width: totalColWidth }}
                          className="flex-shrink-0 border-r border-border last:border-r-0 px-2 py-2 text-center">
                          <div className="flex items-center justify-center gap-1 mb-0.5">
                            {p.photo_url ? (
                              <img src={p.photo_url} alt={p.name}
                                className="w-6 h-6 rounded-full object-cover" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="w-3 h-3 text-primary" />
                              </div>
                            )}
                            <span className={cn('w-2 h-2 rounded-full flex-shrink-0',
                              p.is_online ? 'bg-green-500' : 'bg-gray-300')} />
                          </div>
                          <p className="text-[10px] font-bold text-foreground truncate">{p.name.split(' ')[0]}</p>
                          <p className="text-[9px] text-muted-foreground truncate">{p.specialties?.[0] || ''}</p>
                        </div>
                      ))}
                    </div>

                    {/* Linhas de horas 00:00–23:00 */}
                    <div className="overflow-y-auto max-h-[500px]" ref={dayKey === format(days[0], 'yyyy-MM-dd') ? gridRef : null}>
                      {HOURS.map(hour => {
                        const isNight = hour < 6 || hour >= 22;
                        return (
                          <div key={hour}
                            className={cn('flex border-b border-border last:border-b-0',
                              isNight && 'bg-muted/20')}>
                            {/* Hora */}
                            <div className="w-[52px] flex-shrink-0 border-r border-border flex items-start justify-center pt-1.5 py-2">
                              <span className="text-[10px] font-semibold text-muted-foreground">
                                {String(hour).padStart(2, '0')}:00
                              </span>
                            </div>
                            {/* Coluna sem prestador */}
                            {hasUnassignedInDays && (() => {
                              const slotServices = serviceMap['__none__']?.[dayKey]?.[hour] || [];
                              return (
                                <div style={{ width: totalColWidth }}
                                  className="flex-shrink-0 border-r border-border p-1 min-h-[44px] bg-yellow-50/40">
                                  {slotServices.map(s => (
                                    <button key={s.id}
                                      onClick={() => setSelectedService(s)}
                                      className="w-full text-left flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium mb-0.5 hover:opacity-80 transition-opacity bg-yellow-50 border-yellow-300 text-yellow-800">
                                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-yellow-500" />
                                      <span className="truncate">{SERVICE_LABELS[s.service_type] || s.service_type}</span>
                                    </button>
                                  ))}
                                </div>
                              );
                            })()}
                            {/* Célula por prestador */}
                            {providers.map(p => {
                              const slotServices = serviceMap[p.id]?.[dayKey]?.[hour] || [];
                              return (
                                <div key={p.id}
                                  style={{ width: totalColWidth }}
                                  className="flex-shrink-0 border-r border-border last:border-r-0 p-1 min-h-[44px]">
                                  {slotServices.map(s => (
                                    <button key={s.id}
                                      onClick={() => setSelectedService(s)}
                                      className={cn(
                                        'w-full text-left flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium mb-0.5 hover:opacity-80 transition-opacity',
                                        STATUS_BG[s.status] || 'bg-gray-50 border-gray-200 text-gray-700'
                                      )}>
                                      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', STATUS_DOT[s.status] || 'bg-gray-400')} />
                                      <span className="truncate">{SERVICE_LABELS[s.service_type] || s.service_type}</span>
                                    </button>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}

                      {/* Linha de serviços sem horário */}
                      {(providers.some(p => serviceMap[p.id]?.[dayKey]?.['none']?.length > 0) ||
                        serviceMap['__none__']?.[dayKey]?.['none']?.length > 0) && (
                        <div className="flex border-t-2 border-border bg-muted/30">
                          <div className="w-[52px] flex-shrink-0 border-r border-border flex items-center justify-center py-2 px-1">
                            <span className="text-[9px] text-muted-foreground font-semibold text-center leading-tight">s/ hora</span>
                          </div>
                          {/* Sem prestador */}
                          {hasUnassignedInDays && (() => {
                            const slotServices = serviceMap['__none__']?.[dayKey]?.['none'] || [];
                            return (
                              <div style={{ width: totalColWidth }}
                                className="flex-shrink-0 border-r border-border p-1 min-h-[36px] bg-yellow-50/40">
                                {slotServices.map(s => (
                                  <button key={s.id}
                                    onClick={() => setSelectedService(s)}
                                    className="w-full text-left flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium mb-0.5 hover:opacity-80 transition-opacity bg-yellow-50 border-yellow-300 text-yellow-800">
                                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-yellow-500" />
                                    <span className="truncate">{SERVICE_LABELS[s.service_type] || s.service_type}</span>
                                  </button>
                                ))}
                              </div>
                            );
                          })()}
                          {providers.map(p => {
                            const slotServices = serviceMap[p.id]?.[dayKey]?.['none'] || [];
                            return (
                              <div key={p.id}
                                style={{ width: totalColWidth }}
                                className="flex-shrink-0 border-r border-border last:border-r-0 p-1 min-h-[36px]">
                                {slotServices.map(s => (
                                  <button key={s.id}
                                    onClick={() => setSelectedService(s)}
                                    className={cn(
                                      'w-full text-left flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium mb-0.5 hover:opacity-80 transition-opacity',
                                      STATUS_BG[s.status] || 'bg-gray-50 border-gray-200 text-gray-700'
                                    )}>
                                    <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', STATUS_DOT[s.status] || 'bg-gray-400')} />
                                    <span className="truncate">{SERVICE_LABELS[s.service_type] || s.service_type}</span>
                                  </button>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal detalhe / redirecionamento */}
      {selectedService && (
        <ServiceDetailModal
          service={selectedService}
          providers={allProviders}
          onClose={() => setSelectedService(null)}
          onUpdate={handleServiceUpdate}
        />
      )}
    </div>
  );
}