import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Clock, Loader2, Plus, X, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

const RECURRENCE_OPTIONS = [
  { value: 'semanal', label: 'Semanal' },
  { value: 'quinzenal', label: 'Quinzenal' },
  { value: 'mensal', label: 'Mensal' },
  { value: 'bimestral', label: 'Bimestral' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'semestral', label: 'Semestral' },
  { value: 'anual', label: 'Anual' },
];

export default function RecurringServiceForm({ clientId, clientName, clientPhone, onSuccess, onCancel }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    service_type: '',
    description: '',
    address: '',
    city: '',
    state: '',
    cep: '',
    latitude: null,
    longitude: null,
    recurrence_pattern: 'mensal',
    start_date: '',
    end_date: '',
    client_suggested_price: '',
    preferred_time: '09:00',
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
      return base44.entities.RecurringServiceSchedule.create({
        client_id: clientId,
        client_name: clientName,
        client_phone: clientPhone,
        ...data,
        client_suggested_price: data.client_suggested_price ? Number(data.client_suggested_price) : null,
        latitude: data.latitude ? Number(data.latitude) : null,
        longitude: data.longitude ? Number(data.longitude) : null,
        next_service_date: data.start_date
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-schedules', clientId] });
      onSuccess?.();
    }
  });

  const canSubmit = () => {
    return form.service_type && 
           form.description && 
           form.address && 
           form.city && 
           form.state &&
           form.start_date &&
           form.recurrence_pattern;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onCancel}>
      <div className="bg-card w-full max-w-lg rounded-t-3xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        {/* Cabeçalho fixo */}
        <div className="p-6 pb-4 border-b border-border flex-shrink-0">
          <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-foreground">Agendar serviço recorrente</h3>
            <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Conteúdo com scroll */}
        <div className="overflow-y-auto flex-1 p-6 pt-0 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent hover:scrollbar-thumb-primary/50">
          <div className="space-y-4">
            {/* Tipo de serviço */}
            <div className="space-y-2">
              <Label>Tipo de serviço *</Label>
              <select
                value={form.service_type}
                onChange={e => set('service_type', e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-input bg-transparent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Selecione um serviço</option>
                <option value="eletrica">Elétrica</option>
                <option value="hidraulica">Hidráulica</option>
                <option value="limpeza_calha">Limpeza de Calha</option>
                <option value="limpeza_caixa_dagua">Limpeza Caixa d'Água</option>
                <option value="ar_condicionado">Ar Condicionado</option>
                <option value="manutencao">Manutenção Preventiva</option>
              </select>
            </div>

            {/* CEP - Visível de primeira */}
            <div className="space-y-2 bg-primary/5 p-4 -mx-6 px-6 rounded-lg mt-4">
              <Label className="flex items-center gap-2"><MapPin className="w-4 h-4" /> CEP do local *</Label>
              <div className="relative">
                <Input
                  placeholder="00000-000"
                  value={form.cep}
                  onChange={e => set('cep', e.target.value)}
                  onBlur={() => searchByCep(form.cep)}
                  disabled={loadingCep}
                  className="rounded-lg"
                />
                {loadingCep && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />}
              </div>
              {cepError && <p className="text-xs text-destructive">{cepError}</p>}
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label>Descrição do serviço *</Label>
              <Textarea
                placeholder="Detalhe o serviço de manutenção..."
                value={form.description}
                onChange={e => set('description', e.target.value)}
                className="min-h-[80px] rounded-lg"
              />
            </div>

            {/* Endereço */}
            <div className="space-y-2">
              <Label>Endereço *</Label>
              <Input
                placeholder="Rua e número"
                value={form.address}
                onChange={e => set('address', e.target.value)}
                className="rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Cidade *</Label>
                <Input
                  placeholder="Cidade"
                  value={form.city}
                  onChange={e => set('city', e.target.value)}
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label>Estado *</Label>
                <Input
                  placeholder="UF"
                  value={form.state}
                  onChange={e => set('state', e.target.value.toUpperCase())}
                  maxLength={2}
                  className="rounded-lg"
                />
              </div>
            </div>

            {/* Frequência */}
            <div className="space-y-2">
              <Label>Frequência de recorrência *</Label>
              <div className="grid grid-cols-2 gap-2">
                {RECURRENCE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => set('recurrence_pattern', opt.value)}
                    className={cn(
                      "p-3 rounded-lg border-2 text-sm font-medium transition-all text-center",
                      form.recurrence_pattern === opt.value
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-primary/40 text-foreground"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Datas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Data início *</Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={e => set('start_date', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Data término</Label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={e => set('end_date', e.target.value)}
                  min={form.start_date}
                  className="rounded-lg"
                />
              </div>
            </div>

            {/* Horário preferencial */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Clock className="w-4 h-4" /> Horário preferencial</Label>
              <Input
                type="time"
                value={form.preferred_time}
                onChange={e => set('preferred_time', e.target.value)}
                className="rounded-lg"
              />
            </div>

            {/* Valor sugerido */}
            <div className="space-y-2">
              <Label>Valor sugerido (opcional)</Label>
              <Input
                type="number"
                placeholder="R$ 0,00"
                value={form.client_suggested_price}
                onChange={e => set('client_suggested_price', e.target.value)}
                step="0.01"
                min="0"
                className="rounded-lg"
              />
            </div>

            {/* Notas */}
            <div className="space-y-2">
              <Label>Observações adicionais</Label>
              <Textarea
                placeholder="Qualquer informação importante..."
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                className="min-h-[60px] rounded-lg"
              />
            </div>

            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 text-xs text-blue-700">
              ℹ️ Os serviços serão criados automaticamente nas datas agendadas. Você receberá notificações para cada novo agendamento.
            </div>
          </div>
        </div>

        {/* Botões fixos no rodapé */}
        <div className="flex gap-3 p-6 pt-4 border-t border-border flex-shrink-0 bg-card">
          <Button variant="outline" onClick={onCancel} className="flex-1 rounded-lg">
            Cancelar
          </Button>
          <Button
            onClick={() => createMutation.mutate(form)}
            disabled={!canSubmit() || createMutation.isPending}
            className="flex-1 rounded-lg"
          >
            {createMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" /> Agendar
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}