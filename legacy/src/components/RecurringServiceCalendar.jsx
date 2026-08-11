import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Calendar, Plus, ChevronLeft, ChevronRight, Trash2, Edit2, Clock, MapPin, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const SERVICE_TYPES = {
  limpeza_caixa_dagua: { label: 'Limpeza Caixa d\'Água', icon: '💧' },
  limpeza_gordura: { label: 'Limpeza Gordura', icon: '🔧' },
  limpeza_calha: { label: 'Limpeza de Calha', icon: '🏠' },
  ar_condicionado: { label: 'Ar Condicionado', icon: '❄️' },
  hidraulica: { label: 'Manutenção Hidráulica', icon: '🔌' },
  eletrica: { label: 'Manutenção Elétrica', icon: '⚡' },
  revisao_geral: { label: 'Revisão Geral', icon: '🔍' },
};

const RECURRENCE_PATTERNS = [
  { value: 'semanal', label: 'Semanal' },
  { value: 'quinzenal', label: 'Quinzenal' },
  { value: 'mensal', label: 'Mensal' },
  { value: 'bimestral', label: 'Bimestral' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'semestral', label: 'Semestral' },
  { value: 'anual', label: 'Anual' },
];

const RecurringServiceForm = ({ clientId, onClose, initialData }) => {
  const [form, setForm] = useState(initialData || {
    service_type: '',
    description: '',
    address: '',
    city: '',
    state: '',
    latitude: null,
    longitude: null,
    recurrence_pattern: 'mensal',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    preferred_time: '09:00',
    client_suggested_price: '',
  });

  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        ...form,
        client_id: clientId,
        client_suggested_price: form.client_suggested_price ? Number(form.client_suggested_price) : null,
      };

      if (initialData?.id) {
        return base44.entities.RecurringServiceSchedule.update(initialData.id, data);
      } else {
        return base44.entities.RecurringServiceSchedule.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-services', clientId] });
      toast.success(initialData ? 'Agendamento atualizado!' : 'Agendamento criado!');
      onClose();
    },
    onError: (error) => {
      toast.error('Erro ao salvar: ' + error.message);
    },
  });

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-border p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">
            {initialData ? 'Editar Agendamento' : 'Novo Agendamento'}
          </h2>
          <button onClick={onClose} className="text-2xl text-muted-foreground">×</button>
        </div>

        <div className="p-4 space-y-4">
          {/* Tipo de serviço */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Tipo de Serviço *</label>
            <select
              value={form.service_type}
              onChange={(e) => set('service_type', e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-white focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Selecione um serviço</option>
              {Object.entries(SERVICE_TYPES).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Descrição</label>
            <textarea
              placeholder="Descreva o serviço..."
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              className="w-full h-20 px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          {/* Endereço */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Endereço *</label>
            <input
              placeholder="Rua..."
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Cidade e Estado */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Cidade</label>
              <input
                placeholder="Cidade"
                value={form.city}
                onChange={(e) => set('city', e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Estado</label>
              <input
                placeholder="UF"
                value={form.state}
                onChange={(e) => set('state', e.target.value.toUpperCase())}
                maxLength={2}
                className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary text-sm"
              />
            </div>
          </div>

          {/* Recorrência */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground flex items-center gap-2">
              <RotateCw className="w-4 h-4" /> Frequência *
            </label>
            <select
              value={form.recurrence_pattern}
              onChange={(e) => set('recurrence_pattern', e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-white focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {RECURRENCE_PATTERNS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Data inicial */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Data de Início *
            </label>
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => set('start_date', e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Data final (opcional) */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Data Final (opcional)</label>
            <input
              type="date"
              value={form.end_date}
              onChange={(e) => set('end_date', e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Horário preferido */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" /> Horário Preferido
            </label>
            <input
              type="time"
              value={form.preferred_time}
              onChange={(e) => set('preferred_time', e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Valor sugerido */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Valor Sugerido (opcional)</label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">R$</span>
              <input
                type="number"
                placeholder="0.00"
                value={form.client_suggested_price}
                onChange={(e) => set('client_suggested_price', e.target.value)}
                className="flex-1 h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                step="0.01"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-white border-t border-border p-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-border hover:bg-muted transition-colors font-semibold"
          >
            Cancelar
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!form.service_type || !form.address || saveMutation.isPending}
            className="flex-1 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors font-semibold disabled:opacity-50"
          >
            {saveMutation.isPending ? '...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function RecurringServiceCalendar({ clientId }) {
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const queryClient = useQueryClient();

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['recurring-services', clientId],
    queryFn: () => base44.entities.RecurringServiceSchedule.filter({ client_id: clientId }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RecurringServiceSchedule.update(id, { is_active: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-services', clientId] });
      toast.success('Agendamento cancelado');
    },
  });

  const activeSchedules = schedules.filter(s => s.is_active !== false);

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Serviços Preventivos Recorrentes</h2>
          <p className="text-muted-foreground text-sm mt-1">Agende serviços que se repetem automaticamente</p>
        </div>
        <button
          onClick={() => {
            setEditingSchedule(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors font-semibold"
        >
          <Plus className="w-5 h-5" /> Novo Agendamento
        </button>
      </div>

      {activeSchedules.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-2xl">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-foreground font-semibold mb-1">Nenhum agendamento recorrente</p>
          <p className="text-muted-foreground text-sm mb-4">Crie um para manter seus serviços em dia</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {activeSchedules.map((schedule) => {
            const serviceInfo = SERVICE_TYPES[schedule.service_type];
            const nextDate = new Date(schedule.next_service_date);
            const isOverdue = nextDate < new Date();

            return (
              <div key={schedule.id} className={cn(
                "rounded-2xl border-2 p-4 space-y-3",
                isOverdue ? "border-orange-200 bg-orange-50" : "border-border hover:border-primary/50"
              )}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{serviceInfo?.icon}</span>
                      <div>
                        <h3 className="font-bold text-foreground">{serviceInfo?.label}</h3>
                        <p className="text-xs text-muted-foreground">{schedule.description || 'Sem descrição'}</p>
                      </div>
                    </div>

                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        {schedule.address}, {schedule.city} - {schedule.state}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        {schedule.preferred_time || '—'}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <RotateCw className="w-4 h-4" />
                        {RECURRENCE_PATTERNS.find(p => p.value === schedule.recurrence_pattern)?.label || schedule.recurrence_pattern}
                      </div>
                    </div>

                    {/* Próximo serviço */}
                    <div className={cn(
                      "mt-3 p-2 rounded-lg text-xs font-semibold",
                      isOverdue ? "bg-orange-100 text-orange-700" : "bg-blue-50 text-blue-700"
                    )}>
                      {isOverdue ? '⚠️' : '📅'} Próximo: {new Date(schedule.next_service_date).toLocaleDateString('pt-BR')}
                      {schedule.total_occurrences_created > 0 && <span className=" ml-2">({schedule.total_occurrences_created} criado{schedule.total_occurrences_created > 1 ? 's' : ''})</span>}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingSchedule(schedule);
                        setShowForm(true);
                      }}
                      className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(schedule.id)}
                      disabled={deleteMutation.isPending}
                      className="p-2 rounded-lg hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-600 disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <RecurringServiceForm
          clientId={clientId}
          initialData={editingSchedule}
          onClose={() => {
            setShowForm(false);
            setEditingSchedule(null);
          }}
        />
      )}
    </div>
  );
}