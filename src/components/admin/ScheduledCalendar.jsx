import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChevronLeft, ChevronRight, AlertTriangle, Calendar, User, Wrench, Clock, X
} from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, parseISO, isToday } from 'date-fns';
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
  aceito: 'bg-indigo-50 border-indigo-300 text-indigo-800',
  em_andamento: 'bg-purple-50 border-purple-300 text-purple-800',
  concluido: 'bg-green-50 border-green-300 text-green-800',
  cancelado: 'bg-red-50 border-red-300 text-red-600',
};

const STATUS_DOT = {
  agendado: 'bg-blue-500',
  aguardando: 'bg-yellow-500',
  aceito: 'bg-indigo-500',
  em_andamento: 'bg-purple-500',
  concluido: 'bg-green-500',
  cancelado: 'bg-red-400',
};

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0..23

function getServiceHour(s) {
  if (s.scheduled_time) {
    const h = parseInt(s.scheduled_time.split(':')[0], 10);
    return isNaN(h) ? null : h;
  }
  return null;
}

function getServiceDateKey(s) {
  if (s.scheduled_date) return s.scheduled_date;
  if (s.created_date) return s.created_date.slice(0, 10);
  return null;
}

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
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <Card className="w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <CardTitle className="text-base">{SERVICE_LABELS[service.service_type] || service.service_type}</CardTitle>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-xl p-3 space-y-1 text-sm">
            <p><span className="text-muted-foreground">Cliente:</span> <span className="font-medium">{service.client_name}</span></p>
            <p><span className="text-muted-foreground">Endereço:</span> {service.address}, {service.city}</p>
            <p><span className="text-muted-foreground">Status:</span>
              <span className={cn('ml-1 px-2 py-0.5 rounded text-xs font-medium border', STATUS_BG[service.status])}>
                {service.status}
              </span>
            </p>
            {service.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">{service.description}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">Data agendada</label>
            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">Horário</label>
            <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">Prestador</label>
            <select value={newProviderId} onChange={e => setNewProviderId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Sem prestador</option>
              {providers.filter(p => p.is_approved).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
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
  const [startDay, setStartDay] = useState(new Date());
  const [selectedService, setSelectedService] = useState(null);

  const days = [startDay, addDays(startDay, 1), addDays(startDay, 2)];

  const { data: services = [] } = useQuery({
    queryKey: ['scheduled-calendar-services'],
    queryFn: () => base44.entities.ServiceRequest.list('-created_date', 500),
    refetchInterval: 30000,
    select: (r) => r.filter(s => ['aguardando', 'aceito', 'em_andamento', 'agendado'].includes(s.status)),
  });

  const { data: providers = [] } = useQuery({
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

  // Agrupa serviços por dia e hora
  const servicesByDayHour = useMemo(() => {
    const map = {};
    days.forEach(d => {
      const dayKey = format(d, 'yyyy-MM-dd');
      map[dayKey] = {};
      HOURS.forEach(h => { map[dayKey][h] = []; });
    });
    services.forEach(s => {
      const dateKey = getServiceDateKey(s);
      if (!dateKey || !map[dateKey]) return;
      const hour = getServiceHour(s);
      if (hour !== null) {
        map[dateKey][hour].push(s);
      } else {
        // Sem horário definido → coloca no slot "sem horário" (representado por -1)
        if (!map[dateKey][-1]) map[dateKey][-1] = [];
        map[dateKey][-1].push(s);
      }
    });
    return map;
  }, [services, days]);

  // Slots de horas que têm serviços em algum dos 3 dias (ou todas as horas comerciais)
  const activeHours = useMemo(() => {
    const withServices = new Set();
    days.forEach(d => {
      const dayKey = format(d, 'yyyy-MM-dd');
      HOURS.forEach(h => {
        if (servicesByDayHour[dayKey]?.[h]?.length > 0) withServices.add(h);
      });
    });
    // Sempre mostrar horas comerciais (7-20) + horas com serviços
    const base = Array.from({ length: 14 }, (_, i) => i + 7); // 7..20
    base.forEach(h => withServices.add(h));
    return Array.from(withServices).sort((a, b) => a - b);
  }, [servicesByDayHour, days]);

  // Verifica se há serviços sem horário definido
  const hasNoTimeServices = days.some(d => {
    const dayKey = format(d, 'yyyy-MM-dd');
    return servicesByDayHour[dayKey]?.[-1]?.length > 0;
  });

  const totalServices = services.filter(s => {
    const dk = getServiceDateKey(s);
    return days.some(d => format(d, 'yyyy-MM-dd') === dk);
  }).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Calendário de Agendamentos
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalServices} serviço(s) nos próximos 3 dias
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="rounded-xl h-8 w-8"
            onClick={() => setStartDay(d => addDays(d, -3))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl text-xs"
            onClick={() => setStartDay(new Date())}>
            Hoje
          </Button>
          <Button variant="outline" size="icon" className="rounded-xl h-8 w-8"
            onClick={() => setStartDay(d => addDays(d, 3))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(STATUS_DOT).map(([status, dot]) => (
          <div key={status} className="flex items-center gap-1">
            <span className={cn('w-2 h-2 rounded-full', dot)} />
            <span className="text-muted-foreground capitalize">{status.replace('_', ' ')}</span>
          </div>
        ))}
      </div>

      {/* Grade 3 dias × horas */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Cabeçalhos dos dias */}
        <div className="grid border-b border-border" style={{ gridTemplateColumns: '52px repeat(3, 1fr)' }}>
          <div className="py-2 border-r border-border" />
          {days.map(d => {
            const dayKey = format(d, 'yyyy-MM-dd');
            const dayTotal = Object.values(servicesByDayHour[dayKey] || {}).flat().length;
            return (
              <div key={dayKey}
                className={cn('py-2 px-2 text-center border-r border-border last:border-r-0',
                  isToday(d) && 'bg-primary/5')}>
                <p className={cn('text-xs font-bold uppercase',
                  isToday(d) ? 'text-primary' : 'text-muted-foreground')}>
                  {format(d, 'EEE', { locale: ptBR })}
                </p>
                <p className={cn('text-base font-extrabold',
                  isToday(d) ? 'text-primary' : 'text-foreground')}>
                  {format(d, 'd')}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {format(d, 'MMM', { locale: ptBR })}
                </p>
                {dayTotal > 0 && (
                  <span className="inline-flex items-center gap-0.5 mt-0.5 bg-primary/10 text-primary text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                    <Wrench className="w-2 h-2" /> {dayTotal}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Serviços sem horário definido */}
        {hasNoTimeServices && (
          <div className="grid border-b border-border bg-muted/20"
            style={{ gridTemplateColumns: '52px repeat(3, 1fr)' }}>
            <div className="flex items-center justify-center border-r border-border py-2 px-1">
              <span className="text-[9px] text-muted-foreground font-semibold text-center leading-tight">s/ hora</span>
            </div>
            {days.map(d => {
              const dayKey = format(d, 'yyyy-MM-dd');
              const slotServices = servicesByDayHour[dayKey]?.[-1] || [];
              return (
                <div key={dayKey}
                  className={cn('border-r border-border last:border-r-0 p-1 min-h-[36px]',
                    isToday(d) && 'bg-primary/5')}>
                  {slotServices.map(s => (
                    <button key={s.id}
                      onClick={() => setSelectedService(s)}
                      className={cn('w-full text-left flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium mb-0.5 truncate hover:opacity-80 transition-opacity',
                        STATUS_BG[s.status] || 'bg-gray-50 border-gray-200 text-gray-700')}>
                      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', STATUS_DOT[s.status] || 'bg-gray-400')} />
                      <span className="truncate">{SERVICE_LABELS[s.service_type] || s.service_type}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* Linhas de horas */}
        <div className="overflow-y-auto max-h-[600px]">
          {activeHours.map(hour => (
            <div key={hour} className="grid border-b border-border last:border-b-0"
              style={{ gridTemplateColumns: '52px repeat(3, 1fr)' }}>
              {/* Rótulo da hora */}
              <div className="flex items-start justify-center pt-1 border-r border-border py-2">
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {String(hour).padStart(2, '0')}:00
                </span>
              </div>
              {/* Células de cada dia */}
              {days.map(d => {
                const dayKey = format(d, 'yyyy-MM-dd');
                const slotServices = servicesByDayHour[dayKey]?.[hour] || [];
                return (
                  <div key={dayKey}
                    className={cn('border-r border-border last:border-r-0 p-1 min-h-[44px]',
                      isToday(d) && 'bg-primary/5')}>
                    {slotServices.map(s => (
                      <button key={s.id}
                        onClick={() => setSelectedService(s)}
                        className={cn('w-full text-left flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium mb-0.5 truncate hover:opacity-80 transition-opacity',
                          STATUS_BG[s.status] || 'bg-gray-50 border-gray-200 text-gray-700')}>
                        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', STATUS_DOT[s.status] || 'bg-gray-400')} />
                        <span className="truncate">{SERVICE_LABELS[s.service_type] || s.service_type}</span>
                        {s.provider_name && (
                          <span className="text-[9px] opacity-60 truncate hidden sm:inline">· {s.provider_name.split(' ')[0]}</span>
                        )}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Modal de detalhe */}
      {selectedService && (
        <ServiceDetailModal
          service={selectedService}
          providers={providers}
          onClose={() => setSelectedService(null)}
          onUpdate={handleServiceUpdate}
        />
      )}
    </div>
  );
}