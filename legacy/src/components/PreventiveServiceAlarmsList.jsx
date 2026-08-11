import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, Calendar, Trash2, ToggleLeft, ToggleRight, Loader2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const SERVICE_CONFIG = {
  limpeza_caixa_dagua: { label: 'Limpeza Caixa d\'Água', emoji: '💧', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  limpeza_gordura: { label: 'Limpeza Caixa de Gordura', emoji: '🔧', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  limpeza_calha: { label: 'Limpeza de Calhas', emoji: '🏠', color: 'bg-green-100 text-green-700 border-green-300' },
  ar_condicionado: { label: 'Manutenção Ar Condicionado', emoji: '❄️', color: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
  hidraulica: { label: 'Revisão Hidráulica', emoji: '💦', color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
  eletrica: { label: 'Revisão Elétrica', emoji: '⚡', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  revisao_geral: { label: 'Revisão Geral', emoji: '🔍', color: 'bg-purple-100 text-purple-700 border-purple-300' },
};

export default function PreventiveServiceAlarmsList({ clientId }) {
  const queryClient = useQueryClient();

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ['preventive-reminders', clientId],
    queryFn: () => base44.entities.PreventiveServiceReminder.filter({ client_id: clientId }),
    refetchInterval: 60000
  });

  const toggleMutation = useMutation({
    mutationFn: (reminder) => 
      base44.entities.PreventiveServiceReminder.update(reminder.id, {
        is_active: !reminder.is_active
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preventive-reminders', clientId] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (reminderId) => 
      base44.entities.PreventiveServiceReminder.delete(reminderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preventive-reminders', clientId] });
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (reminders.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>Nenhum alarme de manutenção configurado</p>
      </div>
    );
  }

  const activeReminders = reminders.filter(r => r.is_active);
  const inactiveReminders = reminders.filter(r => !r.is_active);

  return (
    <div className="space-y-4">
      {/* Alarmes ativos */}
      {activeReminders.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            Alarmes ativos ({activeReminders.length})
          </h4>
          {activeReminders.map(reminder => {
            const config = SERVICE_CONFIG[reminder.service_type];
            const nextDate = new Date(reminder.next_reminder_date);
            const today = new Date();
            const daysUntil = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));
            const isUrgent = daysUntil <= 7 && daysUntil >= 0;
            const isOverdue = daysUntil < 0;

            return (
              <Card key={reminder.id} className={cn(isOverdue && "border-red-300 bg-red-50")}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <span className="text-2xl">{config.emoji}</span>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">{config.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {reminder.reminder_interval_label}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleMutation.mutate(reminder)}
                      disabled={toggleMutation.isPending}
                      className="p-2 hover:bg-accent rounded-lg transition-colors flex-shrink-0"
                    >
                      <ToggleRight className="w-5 h-5 text-primary" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <div>
                        <p className="font-medium text-foreground">Último serviço</p>
                        <p>{new Date(reminder.last_service_date).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                    <div className={cn("flex items-center gap-2 p-2 rounded-lg", isOverdue ? "bg-red-200" : isUrgent ? "bg-orange-100" : "bg-blue-100")}>
                      <Clock className={cn("w-4 h-4", isOverdue ? "text-red-600" : isUrgent ? "text-orange-600" : "text-blue-600")} />
                      <div>
                        <p className={cn("font-medium", isOverdue ? "text-red-700" : isUrgent ? "text-orange-700" : "text-blue-700")}>
                          {isOverdue ? 'Vencido' : `${daysUntil} dias`}
                        </p>
                        <p className={cn("text-[10px]", isOverdue ? "text-red-600" : isUrgent ? "text-orange-600" : "text-blue-600")}>
                          {nextDate.toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {reminder.notes && (
                    <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
                      📝 {reminder.notes}
                    </p>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(reminder.id)}
                    disabled={deleteMutation.isPending}
                    className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive text-xs"
                  >
                    <Trash2 className="w-3 h-3 mr-2" />
                    Remover alarme
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Alarmes inativos */}
      {inactiveReminders.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground">Inativos ({inactiveReminders.length})</h4>
          <div className="space-y-2">
            {inactiveReminders.map(reminder => {
              const config = SERVICE_CONFIG[reminder.service_type];
              return (
                <Card key={reminder.id} className="opacity-60">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{config.emoji}</span>
                        <div>
                          <p className="text-sm font-medium text-foreground">{config.label}</p>
                          <p className="text-xs text-muted-foreground">{reminder.reminder_interval_label}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleMutation.mutate(reminder)}
                        disabled={toggleMutation.isPending}
                        className="p-2 hover:bg-accent rounded-lg transition-colors"
                      >
                        <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}