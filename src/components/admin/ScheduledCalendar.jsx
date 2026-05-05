import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChevronLeft, ChevronRight, AlertTriangle, Calendar, User, Wrench, Clock, X, Info
} from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, parseISO, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';

const SERVICE_LABELS = {
  eletrica: "Elétrica", hidraulica: "Hidráulica", pintura: "Pintura",
  reparo_geral: "Reparo Geral", montagem: "Montagem", alvenaria: "Alvenaria",
  fechadura: "Fechadura", ar_condicionado: "Ar Condicionado",
  limpeza_caixa_dagua: "Caixa D'água", limpeza_calha: "Calha",
  desentupimento: "Desentupimento", reboque: "Reboque", outros: "Outros",
};

const STATUS_COLORS = {
  agendado: 'bg-blue-500',
  aguardando: 'bg-yellow-500',
  aceito: 'bg-indigo-500',
  em_andamento: 'bg-purple-500',
  concluido: 'bg-green-500',
  cancelado: 'bg-red-400',
};

const STATUS_BG = {
  agendado: 'bg-blue-50 border-blue-200 text-blue-800',
  aguardando: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  aceito: 'bg-indigo-50 border-indigo-200 text-indigo-800',
  em_andamento: 'bg-purple-50 border-purple-200 text-purple-800',
  concluido: 'bg-green-50 border-green-200 text-green-800',
  cancelado: 'bg-red-50 border-red-200 text-red-400',
};

// Detecta conflito: mesmo prestador, mesma data/hora
function detectConflicts(services) {
  const conflicts = new Set();
  const byProvider = {};
  services.forEach(s => {
    if (!s.provider_id) return;
    const dateKey = s.scheduled_date || (s.created_date ? s.created_date.slice(0, 10) : null);
    if (!dateKey) return;
    const key = `${s.provider_id}_${dateKey}`;
    if (!byProvider[key]) byProvider[key] = [];
    byProvider[key].push(s.id);
  });
  Object.values(byProvider).forEach(ids => {
    if (ids.length > 1) ids.forEach(id => conflicts.add(id));
  });
  return conflicts;
}

function ServiceChip({ service, index, isConflict, onClick }) {
  const label = SERVICE_LABELS[service.service_type] || service.service_type;
  const dot = STATUS_COLORS[service.status] || 'bg-gray-400';

  return (
    <Draggable draggableId={service.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(service)}
          className={cn(
            'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium cursor-grab select-none border transition-all mb-0.5',
            isConflict ? 'border-red-400 bg-red-50 text-red-700' : 'border-border bg-white text-foreground',
            snapshot.isDragging && 'shadow-lg ring-2 ring-primary/40 scale-105 opacity-90',
          )}
          style={{ ...provided.draggableProps.style }}
        >
          <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dot)} />
          <span className="truncate max-w-[80px]">{label}</span>
          {isConflict && <AlertTriangle className="w-2.5 h-2.5 text-red-500 flex-shrink-0" />}
        </div>
      )}
    </Draggable>
  );
}

// Retorna a data efetiva do serviço para exibição no calendário
function getServiceDateKey(s) {
  if (s.scheduled_date) return s.scheduled_date;
  // Serviços imediatos sem data agendada: usa data de criação
  if (s.created_date) return s.created_date.slice(0, 10);
  return null;
}

function DayCell({ day, services, conflicts, currentMonth, onServiceClick }) {
  const isCurrentMonth = isSameMonth(day, currentMonth);
  const dayKey = format(day, 'yyyy-MM-dd');
  const dayServices = services.filter(s => getServiceDateKey(s) === dayKey);
  const hasConflict = dayServices.some(s => conflicts.has(s.id));

  return (
    <Droppable droppableId={dayKey}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={cn(
            'min-h-[90px] border border-border rounded-lg p-1 transition-colors',
            !isCurrentMonth && 'opacity-40 bg-muted/30',
            isToday(day) && 'ring-2 ring-primary/60 bg-primary/5',
            snapshot.isDraggingOver && 'bg-primary/10 border-primary/40',
            hasConflict && 'ring-1 ring-red-300',
          )}
        >
          <div className="flex items-center justify-between mb-0.5">
            <span className={cn(
              'text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full',
              isToday(day) ? 'bg-primary text-primary-foreground' : 'text-foreground',
            )}>
              {format(day, 'd')}
            </span>
            {hasConflict && (
              <AlertTriangle className="w-3 h-3 text-red-500" />
            )}
          </div>
          <div className="space-y-px">
            {dayServices.slice(0, 3).map((s, i) => (
              <ServiceChip
                key={s.id}
                service={s}
                index={i}
                isConflict={conflicts.has(s.id)}
                onClick={onServiceClick}
              />
            ))}
            {dayServices.length > 3 && (
              <p className="text-[9px] text-muted-foreground px-1">+{dayServices.length - 3} mais</p>
            )}
          </div>
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}

function ServiceDetailModal({ service, providers, onClose, onUpdate, onReschedule }) {
  const [newDate, setNewDate] = useState(service.scheduled_date || '');
  const [newProviderId, setNewProviderId] = useState(service.provider_id || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const provider = providers.find(p => p.id === newProviderId);
    const updates = {
      scheduled_date: newDate || null,
      provider_id: newProviderId || null,
      provider_name: provider?.name || service.provider_name,
      provider_phone: provider?.phone || service.provider_phone,
    };
    await onUpdate(service.id, updates);
    setSaving(false);
    onClose();
  };

  const label = SERVICE_LABELS[service.service_type] || service.service_type;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <Card className="w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <CardTitle className="text-base">{label}</CardTitle>
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
            <input
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">Prestador</label>
            <select
              value={newProviderId}
              onChange={e => setNewProviderId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
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
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedService, setSelectedService] = useState(null);

  // Busca todos os serviços ativos (aguardando, aceito, em_andamento, agendado)
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

  const conflicts = useMemo(() => detectConflicts(services), [services]);

  const updateService = useMutation({
    mutationFn: ({ id, updates }) => base44.entities.ServiceRequest.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-calendar-services'] });
      toast.success('Serviço atualizado');
    },
    onError: () => toast.error('Erro ao atualizar serviço'),
  });

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  // Pad days to start on Sunday
  const startPad = startOfMonth(currentMonth).getDay();
  const paddedDays = Array(startPad).fill(null).concat(days);

  const handleDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    const newDate = destination.droppableId; // formato yyyy-MM-dd
    const service = services.find(s => s.id === draggableId);
    if (!service) return;

    updateService.mutate({
      id: draggableId,
      updates: { scheduled_date: newDate, status: service.status === 'aguardando' ? 'agendado' : service.status },
    });
    toast.info(`Serviço movido para ${format(parseISO(newDate), "dd 'de' MMMM", { locale: ptBR })}`);
  };

  const handleServiceUpdate = async (id, updates) => {
    await updateService.mutateAsync({ id, updates });
  };

  const conflictCount = conflicts.size;
  const monthServices = services.filter(s => {
    const dateKey = getServiceDateKey(s);
    if (!dateKey) return false;
    try {
      return isSameMonth(parseISO(dateKey), currentMonth);
    } catch { return false; }
  });

  const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Calendário de Agendamentos
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {monthServices.length} serviço(s) neste mês
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="rounded-xl h-8 w-8" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-semibold capitalize min-w-[120px] text-center">
            {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
          </span>
          <Button variant="outline" size="icon" className="rounded-xl h-8 w-8" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl text-xs" onClick={() => setCurrentMonth(new Date())}>
            Hoje
          </Button>
        </div>
      </div>

      {/* Conflitos */}
      {conflictCount > 0 && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 font-semibold">
            {conflictCount} conflito(s) de agenda detectado(s) — mesmo prestador, mesma data
          </p>
        </div>
      )}

      {/* Legenda */}
      <div className="flex flex-wrap gap-3 text-xs">
        {[
          { label: 'Agendado', dot: 'bg-blue-500' },
          { label: 'Aguardando', dot: 'bg-yellow-500' },
          { label: 'Aceito', dot: 'bg-indigo-500' },
          { label: 'Em andamento', dot: 'bg-purple-500' },
          { label: 'Conflito', dot: 'bg-red-500', icon: true },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1">
            <span className={cn('w-2 h-2 rounded-full', l.dot)} />
            {l.icon && <AlertTriangle className="w-2.5 h-2.5 text-red-500" />}
            <span className="text-muted-foreground">{l.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1">
          <Info className="w-3 h-3 text-muted-foreground" />
          <span className="text-muted-foreground">Arraste para reagendar</span>
        </div>
      </div>

      {/* Calendário */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {/* Dias da semana */}
          <div className="grid grid-cols-7 border-b border-border">
            {WEEK_DAYS.map(d => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground">
                {d}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-1 p-2">
            {paddedDays.map((day, idx) => {
              if (!day) return <div key={`pad-${idx}`} className="min-h-[90px]" />;
              return (
                <DayCell
                  key={day.toISOString()}
                  day={day}
                  services={services}
                  conflicts={conflicts}
                  currentMonth={currentMonth}
                  onServiceClick={setSelectedService}
                />
              );
            })}
          </div>
        </div>
      </DragDropContext>

      {/* Lista de conflitos */}
      {conflictCount > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-red-700 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" /> Serviços com conflito
          </h3>
          {services.filter(s => conflicts.has(s.id)).map(s => (
            <div
              key={s.id}
              className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl cursor-pointer hover:bg-red-100 transition-colors"
              onClick={() => setSelectedService(s)}
            >
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-800">
                  {SERVICE_LABELS[s.service_type] || s.service_type} — {s.client_name}
                </p>
                <p className="text-xs text-red-600">
                  📅 {s.scheduled_date} · 🔧 {s.provider_name || 'Sem prestador'}
                </p>
              </div>
              <Button size="sm" variant="outline" className="rounded-xl text-xs border-red-300 text-red-700 hover:bg-red-100">
                Resolver
              </Button>
            </div>
          ))}
        </div>
      )}

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