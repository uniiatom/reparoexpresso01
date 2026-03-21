import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const DAYS = [
  { name: 'Domingo', value: 0 },
  { name: 'Segunda', value: 1 },
  { name: 'Terça', value: 2 },
  { name: 'Quarta', value: 3 },
  { name: 'Quinta', value: 4 },
  { name: 'Sexta', value: 5 },
  { name: 'Sábado', value: 6 },
];

export default function ProviderSchedule() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [provider, setProvider] = useState(null);
  const [editingDay, setEditingDay] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await base44.auth.me();
        if (!user || user?.role !== 'prestador') {
          navigate('/');
          return;
        }
        const providers = await base44.entities.Provider.filter({ user_id: user.id });
        if (providers.length > 0) {
          setProvider(providers[0]);
        }
      } catch (error) {
        console.error('Auth error:', error);
        navigate('/');
      }
    };
    checkAuth();
  }, [navigate]);

  // Fetch availability
  const { data: availability = [] } = useQuery({
    queryKey: ['provider-availability', provider?.id],
    queryFn: () => base44.entities.ProviderAvailability.filter({ provider_id: provider?.id }),
    enabled: !!provider?.id,
  });

  const createOrUpdateAvailability = useMutation({
    mutationFn: async (data) => {
      const existing = availability.find(a => a.day_of_week === data.day_of_week);
      if (existing) {
        await base44.entities.ProviderAvailability.update(existing.id, data);
      } else {
        await base44.entities.ProviderAvailability.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-availability', provider?.id] });
      setEditingDay(null);
      setToast({ type: 'success', message: 'Horário atualizado com sucesso!' });
      setTimeout(() => setToast(null), 3000);
    },
    onError: () => {
      setToast({ type: 'error', message: 'Erro ao salvar horário' });
      setTimeout(() => setToast(null), 3000);
    },
  });

  if (!provider) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-2xl mx-auto px-4 py-6 pb-20">
      {/* Toast */}
      {toast && (
        <div className={cn("fixed top-4 right-4 p-4 rounded-2xl text-white font-semibold shadow-lg z-50", toast.type === 'success' ? 'bg-green-500' : 'bg-red-500')}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-primary mb-8 hover:text-primary/80 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" /> Voltar
      </button>

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
          <Clock className="w-8 h-8 text-primary" /> Horários de Atendimento
        </h1>
        <p className="text-muted-foreground">Defina suas disponibilidades semanais</p>
      </motion.div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-900">
          Configure seus horários de atendimento para cada dia da semana. Os clientes só poderão agendar dentro desses períodos.
        </p>
      </div>

      {/* Schedule Grid */}
      <div className="space-y-3">
        {DAYS.map((day, idx) => {
          const dayAvailability = availability.find(a => a.day_of_week === day.value);
          const isEditing = editingDay === day.value;

          return (
            <motion.div
              key={day.value}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-card rounded-2xl border border-border overflow-hidden"
            >
              <div className="p-4">
                {!isEditing ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-foreground">{day.name}</h3>
                      {dayAvailability?.is_available ? (
                        <p className="text-sm text-primary">
                          {dayAvailability.start_time} - {dayAvailability.end_time}
                          <span className="text-muted-foreground ml-2">({dayAvailability.max_slots_per_day} slots)</span>
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">Fechado</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingDay(day.value)}
                      className="rounded-xl"
                    >
                      Editar
                    </Button>
                  </div>
                ) : (
                  <ScheduleEditor
                    day={day}
                    availability={dayAvailability}
                    onSave={(data) => {
                      createOrUpdateAvailability.mutate({
                        provider_id: provider.id,
                        day_of_week: day.value,
                        ...data,
                      });
                    }}
                    onCancel={() => setEditingDay(null)}
                    isSaving={createOrUpdateAvailability.isPending}
                  />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function ScheduleEditor({ day, availability, onSave, onCancel, isSaving }) {
  const [isAvailable, setIsAvailable] = useState(availability?.is_available ?? true);
  const [startTime, setStartTime] = useState(availability?.start_time ?? '08:00');
  const [endTime, setEndTime] = useState(availability?.end_time ?? '18:00');
  const [maxSlots, setMaxSlots] = useState(availability?.max_slots_per_day ?? 5);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={isAvailable}
          onChange={(e) => setIsAvailable(e.target.checked)}
          className="w-5 h-5 rounded"
        />
        <label className="text-sm font-medium text-foreground">Disponível em {day.name}</label>
      </div>

      {isAvailable && (
        <div className="space-y-3 pl-8">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block font-semibold">Hora inicial</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block font-semibold">Hora final</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block font-semibold">Máximo de serviços/dia</label>
            <input
              type="number"
              min="1"
              max="10"
              value={maxSlots}
              onChange={(e) => setMaxSlots(parseInt(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
            />
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button
          onClick={() => onSave({ is_available: isAvailable, start_time: startTime, end_time: endTime, max_slots_per_day: maxSlots })}
          disabled={isSaving}
          className="flex-1 bg-primary text-primary-foreground rounded-2xl h-10"
        >
          {isSaving ? 'Salvando...' : 'Salvar'}
        </Button>
        <Button
          onClick={onCancel}
          variant="outline"
          className="flex-1 rounded-2xl h-10"
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}