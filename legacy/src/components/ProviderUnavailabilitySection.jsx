import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { CalendarOff, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

export default function ProviderUnavailabilitySection({ providerId }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reason, setReason] = useState('');

  const { data: unavailabilities = [] } = useQuery({
    queryKey: ['provider-unavailability', providerId],
    queryFn: () => base44.entities.ProviderUnavailability.filter({ provider_id: providerId }),
    enabled: !!providerId,
  });

  const createMutation = useMutation({
    mutationFn: () => base44.entities.ProviderUnavailability.create({
      provider_id: providerId,
      start_date: startDate,
      end_date: endDate,
      start_time: startTime || undefined,
      end_time: endTime || undefined,
      reason: reason || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-unavailability', providerId] });
      setShowForm(false);
      setStartDate('');
      setEndDate('');
      setStartTime('');
      setEndTime('');
      setReason('');
      toast.success('Indisponibilidade registrada!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProviderUnavailability.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-unavailability', providerId] });
      toast.info('Indisponibilidade removida.');
    },
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const handleSave = () => {
    if (!startDate || !endDate) {
      toast.error('Informe as datas de início e fim.');
      return;
    }
    if (endDate < startDate) {
      toast.error('A data de fim deve ser igual ou posterior ao início.');
      return;
    }
    createMutation.mutate();
  };

  // Ordena pelo mais próximo
  const sorted = [...unavailabilities].sort((a, b) => a.start_date.localeCompare(b.start_date));
  const today = new Date().toISOString().split('T')[0];
  const upcoming = sorted.filter(u => u.end_date >= today);
  const past = sorted.filter(u => u.end_date < today);

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <CalendarOff className="w-5 h-5 text-destructive" />
          Indisponibilidades
        </h2>
        <Button
          size="sm"
          variant={showForm ? "outline" : "default"}
          className="rounded-xl gap-1"
          onClick={() => setShowForm(v => !v)}
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancelar' : 'Adicionar'}
        </Button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-2xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Data início</label>
              <input
                type="date"
                value={startDate}
                min={today}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Data fim</label>
              <input
                type="date"
                value={endDate}
                min={startDate || today}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Hora início (opcional)</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Hora fim (opcional)</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Motivo (opcional)</label>
            <input
              type="text"
              placeholder="Ex: Férias, consulta médica, viagem..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
            />
          </div>
          <Button
            className="w-full rounded-xl"
            onClick={handleSave}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Salvando...' : 'Salvar indisponibilidade'}
          </Button>
        </div>
      )}

      {upcoming.length === 0 && !showForm && (
        <div className="bg-card border border-border rounded-2xl p-6 text-center text-sm text-muted-foreground">
          Nenhuma indisponibilidade cadastrada.
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="space-y-2 mb-4">
          {upcoming.map(u => (
            <div key={u.id} className="bg-card border border-destructive/30 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-foreground text-sm">
                  {formatDate(u.start_date)}{u.start_date !== u.end_date ? ` → ${formatDate(u.end_date)}` : ''}
                </p>
                {(u.start_time || u.end_time) && (
                  <p className="text-xs text-primary font-medium mt-0.5">
                    🕐 {u.start_time || '--:--'} às {u.end_time || '--:--'}
                  </p>
                )}
                {u.reason && <p className="text-xs text-muted-foreground mt-0.5">{u.reason}</p>}
              </div>
              <button
                onClick={() => deleteMutation.mutate(u.id)}
                className="text-destructive hover:text-destructive/70 transition-colors p-1 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {past.length > 0 && (
        <details className="mt-2">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors mb-2">
            Ver {past.length} registro(s) passado(s)
          </summary>
          <div className="space-y-2">
            {past.map(u => (
              <div key={u.id} className="bg-muted/50 border border-border rounded-xl p-3 flex items-center justify-between gap-3 opacity-60">
                <div>
                  <p className="font-medium text-foreground text-sm">
                    {formatDate(u.start_date)}{u.start_date !== u.end_date ? ` → ${formatDate(u.end_date)}` : ''}
                  </p>
                  {(u.start_time || u.end_time) && (
                    <p className="text-xs text-muted-foreground mt-0.5">🕐 {u.start_time || '--:--'} às {u.end_time || '--:--'}</p>
                  )}
                  {u.reason && <p className="text-xs text-muted-foreground">{u.reason}</p>}
                </div>
                <button onClick={() => deleteMutation.mutate(u.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}