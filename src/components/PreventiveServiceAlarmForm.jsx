import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Bell, Calendar, Loader2, Plus, X, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

const PREVENTIVE_SERVICES = [
  { value: 'limpeza_caixa_dagua', label: 'Limpeza Caixa d\'Água', emoji: '💧' },
  { value: 'limpeza_gordura', label: 'Limpeza Caixa de Gordura', emoji: '🔧' },
  { value: 'limpeza_calha', label: 'Limpeza de Calhas', emoji: '🏠' },
  { value: 'ar_condicionado', label: 'Manutenção Ar Condicionado', emoji: '❄️' },
  { value: 'hidraulica', label: 'Revisão Hidráulica', emoji: '💦' },
  { value: 'eletrica', label: 'Revisão Elétrica', emoji: '⚡' },
  { value: 'revisao_geral', label: 'Revisão Geral', emoji: '🔍' },
];

const INTERVALS = [
  { days: 30, label: 'mensal' },
  { days: 90, label: 'trimestral' },
  { days: 180, label: 'semestral' },
  { days: 365, label: 'anual' },
];

export default function PreventiveServiceAlarmForm({ clientId, clientName, onSuccess, onCancel }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    service_type: '',
    last_service_date: '',
    interval: 'trimestral',
    cep: '',
    address: '',
    city: '',
    state: '',
    notes: ''
  });

  const [loadingCep, setLoadingCep] = useState(false);
  const [cepError, setCepError] = useState('');

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const searchByCep = async (cep) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setLoadingCep(true);
    setCepError('');
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();

      if (data.erro) {
        setCepError('CEP não encontrado');
        setLoadingCep(false);
        return;
      }

      setForm(prev => ({
        ...prev,
        address: data.logradouro || '',
        city: data.localidade || '',
        state: data.uf || '',
        cep: cleanCep,
      }));
    } catch {
      setCepError('Erro ao buscar CEP');
    }
    setLoadingCep(false);
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const interval = INTERVALS.find(i => i.label === data.interval);
      const lastDate = new Date(data.last_service_date);
      const nextDate = new Date(lastDate);
      nextDate.setDate(nextDate.getDate() + interval.days);

      return base44.entities.PreventiveServiceReminder.create({
        client_id: clientId,
        client_name: clientName,
        service_type: data.service_type,
        last_service_date: data.last_service_date,
        reminder_interval_days: interval.days,
        reminder_interval_label: data.interval,
        next_reminder_date: nextDate.toISOString().split('T')[0],
        notes: data.notes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preventive-reminders', clientId] });
      onSuccess?.();
    }
  });

  const canSubmit = () => {
    return form.service_type && form.last_service_date && form.interval;
  };

  const selectedService = PREVENTIVE_SERVICES.find(s => s.value === form.service_type);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4" onClick={onCancel}>
      <div className="bg-card w-full max-w-lg rounded-t-3xl flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        {/* Header fixo */}
        <div className="p-6 pb-4 border-b border-border flex-shrink-0">
          <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Alarme de Manutenção</h3>
            </div>
            <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Conteúdo com scroll */}
        <div className="overflow-y-auto flex-1 p-6 pt-0 space-y-4">
          {/* Tipo de serviço */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Tipo de serviço preventivo *</Label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {PREVENTIVE_SERVICES.map(service => (
                <button
                  key={service.value}
                  onClick={() => set('service_type', service.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-center",
                    form.service_type === service.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  <span className="text-2xl">{service.emoji}</span>
                  <span className="text-xs font-medium text-foreground leading-tight">
                    {service.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* CEP - Visível de primeira */}
          <div className="space-y-2 bg-primary/5 p-4 -mx-6 px-6 rounded-lg mt-4">
                <Label className="flex items-center gap-2"><MapPin className="w-4 h-4" /> CEP do local</Label>
                <div className="relative">
                  <Input
                    placeholder="00000-000"
                    value={form.cep}
                    onChange={e => set('cep', e.target.value)}
                    onBlur={() => searchByCep(form.cep)}
                    disabled={loadingCep}
                    className="rounded-xl"
                  />
                  {loadingCep && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />}
                </div>
                {cepError && <p className="text-xs text-destructive">{cepError}</p>}
              {form.address && (
                <div className="mt-2 bg-white rounded-lg p-2 text-xs border border-primary/20">
                  <p className="text-foreground font-medium">{form.address}</p>
                  <p className="text-muted-foreground">{form.city}, {form.state}</p>
                </div>
              )}
            </div>

          {selectedService && (
            <>
              {/* Data do último serviço */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Data do último serviço *
                </Label>
                <Input
                  type="date"
                  value={form.last_service_date}
                  onChange={e => set('last_service_date', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="rounded-xl"
                />
              </div>

              {/* Intervalo de lembrete */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Frequência de lembrete *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {INTERVALS.map(interval => (
                    <button
                      key={interval.label}
                      onClick={() => set('interval', interval.label)}
                      className={cn(
                        "p-3 rounded-xl border-2 text-sm font-medium transition-all text-center",
                        form.interval === interval.label
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:border-primary/40 text-foreground"
                      )}
                    >
                      {interval.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview da próxima data */}
              {form.last_service_date && form.interval && (
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-200 text-sm">
                  <p className="text-blue-900 font-medium">
                    📅 Próximo lembrete
                  </p>
                  <p className="text-blue-700 mt-1">
                    {(() => {
                      const interval = INTERVALS.find(i => i.label === form.interval);
                      const nextDate = new Date(form.last_service_date);
                      nextDate.setDate(nextDate.getDate() + interval.days);
                      return nextDate.toLocaleDateString('pt-BR');
                    })()}
                  </p>
                </div>
              )}

              {/* Notas */}
              <div className="space-y-2">
                <Label>Observações (opcional)</Label>
                <Textarea
                  placeholder="Ex: próximo serviço em 90 dias, verificar com prestador..."
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  className="min-h-[70px] rounded-xl"
                />
              </div>

              <div className="bg-green-50 rounded-xl p-3 border border-green-200 text-xs text-green-700">
                ✓ Você receberá um lembrete por email na data programada
              </div>
            </>
          )}
        </div>

        {/* Botões fixos no rodapé */}
        <div className="flex gap-3 p-6 pt-4 border-t border-border flex-shrink-0 bg-card">
          <Button variant="outline" onClick={onCancel} className="flex-1 rounded-xl">
            Cancelar
          </Button>
          <Button
            onClick={() => createMutation.mutate(form)}
            disabled={!canSubmit() || createMutation.isPending}
            className="flex-1 rounded-xl"
          >
            {createMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" /> Criar Alarme
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}