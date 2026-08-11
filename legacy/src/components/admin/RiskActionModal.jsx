import React, { useState } from 'react';
import { X, User, Calendar, ArrowRight, AlertTriangle, RefreshCw, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const SERVICE_LABELS = {
  eletrica: "Elétrica", hidraulica: "Hidráulica", pintura: "Pintura",
  reparo_geral: "Reparo Geral", montagem: "Montagem", alvenaria: "Alvenaria",
  fechadura: "Fechadura", ar_condicionado: "Ar Cond.", limpeza_caixa_dagua: "Caixa D'água",
  limpeza_calha: "Calha", desentupimento: "Desentup.", reboque: "Reboque", outros: "Outros",
};

const TIME_SLOTS = ["07:00","08:00","09:00","10:00","11:00","13:00","14:00","15:00","16:00","17:00","18:00"];

export default function RiskActionModal({ service, providers, riskScore, onClose, onSaved }) {
  const [mode, setMode] = useState(null); // 'reassign' | 'reschedule'
  const [newProviderId, setNewProviderId] = useState('');
  const [newDate, setNewDate] = useState(service.scheduled_date || '');
  const [newTime, setNewTime] = useState(service.scheduled_time || '');
  const [saving, setSaving] = useState(false);

  const riskColor = riskScore >= 70 ? 'text-red-700 bg-red-50 border-red-300'
    : riskScore >= 40 ? 'text-amber-700 bg-amber-50 border-amber-300'
    : 'text-green-700 bg-green-50 border-green-300';

  const availableProviders = providers.filter(p =>
    p.is_approved && !p.is_blocked && !p.is_archived && p.id !== service.provider_id
  );

  const handleReassign = async () => {
    if (!newProviderId) return;
    setSaving(true);
    const provider = providers.find(p => p.id === newProviderId);
    try {
      await base44.entities.ServiceRequest.update(service.id, {
        provider_id: newProviderId,
        provider_name: provider?.name || '',
        provider_phone: provider?.phone || '',
        status: service.status === 'aguardando' ? 'agendado' : service.status,
      });
      toast.success(`Serviço transferido para ${provider?.name}`);
      onSaved && onSaved();
      onClose();
    } catch (e) {
      toast.error('Erro ao transferir serviço');
    } finally {
      setSaving(false);
    }
  };

  const handleReschedule = async () => {
    if (!newDate || !newTime) return;
    setSaving(true);
    try {
      await base44.entities.ServiceRequest.update(service.id, {
        scheduled_date: newDate,
        scheduled_time: newTime,
        modality: 'agendado',
      });
      toast.success('Serviço reagendado com sucesso');
      onSaved && onSaved();
      onClose();
    } catch (e) {
      toast.error('Erro ao reagendar serviço');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <Card className="w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Ação de Risco
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {SERVICE_LABELS[service.service_type] || service.service_type} · {service.client_name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn('text-xs font-bold px-2 py-1 rounded-lg border', riskColor)}>
              Risco {riskScore}%
            </span>
            <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        <CardContent className="p-5 space-y-4">
          {/* Info do serviço */}
          <div className="bg-muted/50 rounded-xl p-3 text-xs space-y-1">
            {service.provider_name && (
              <p><span className="text-muted-foreground">Prestador atual:</span> <span className="font-semibold">{service.provider_name}</span></p>
            )}
            <p><span className="text-muted-foreground">Status:</span> <span className="font-semibold capitalize">{service.status?.replace(/_/g, ' ')}</span></p>
            {service.scheduled_date && (
              <p><span className="text-muted-foreground">Agendado:</span> <span className="font-semibold">{service.scheduled_date} {service.scheduled_time || ''}</span></p>
            )}
            <p><span className="text-muted-foreground">Endereço:</span> {service.address}{service.city ? `, ${service.city}` : ''}</p>
          </div>

          {/* Escolha de ação */}
          {!mode && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMode('reassign')}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-border hover:border-primary/60 hover:bg-primary/5 transition-all text-center"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Trocar Prestador</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Redirecionar para outro profissional</p>
                </div>
              </button>
              <button
                onClick={() => setMode('reschedule')}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-border hover:border-primary/60 hover:bg-primary/5 transition-all text-center"
              >
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Reagendar</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Alterar data e horário do serviço</p>
                </div>
              </button>
            </div>
          )}

          {/* Trocar prestador */}
          {mode === 'reassign' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <RefreshCw className="w-4 h-4 text-blue-600" />
                <p className="text-sm font-bold text-foreground">Escolher novo prestador</p>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {availableProviders.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhum prestador disponível</p>
                ) : availableProviders.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setNewProviderId(p.id)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
                      newProviderId === p.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/40'
                    )}
                  >
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {p.photo_url
                        ? <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />
                        : <span className="text-sm font-bold text-primary">{p.name?.charAt(0)}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{p.specialties?.slice(0, 3).join(', ') || 'Geral'}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={cn('w-2 h-2 rounded-full', p.is_online ? 'bg-green-500' : 'bg-gray-300')} />
                      <span className="text-[9px] text-muted-foreground">⭐ {(p.rating || 5).toFixed(1)}</span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setMode(null)}>Voltar</Button>
                <Button
                  className="flex-1 rounded-xl"
                  disabled={!newProviderId || saving}
                  onClick={handleReassign}
                >
                  <ArrowRight className="w-4 h-4 mr-1" />
                  {saving ? 'Transferindo...' : 'Transferir'}
                </Button>
              </div>
            </div>
          )}

          {/* Reagendar */}
          {mode === 'reschedule' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-amber-600" />
                <p className="text-sm font-bold text-foreground">Nova data e horário</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Data</label>
                <input
                  type="date"
                  value={newDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => { setNewDate(e.target.value); setNewTime(''); }}
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-2">Horário</label>
                <div className="flex flex-wrap gap-2">
                  {TIME_SLOTS.map(t => (
                    <button
                      key={t}
                      onClick={() => setNewTime(t)}
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-xs font-medium border-2 transition-all',
                        newTime === t
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-foreground hover:border-primary/40'
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setMode(null)}>Voltar</Button>
                <Button
                  className="flex-1 rounded-xl"
                  disabled={!newDate || !newTime || saving}
                  onClick={handleReschedule}
                >
                  <Calendar className="w-4 h-4 mr-1" />
                  {saving ? 'Reagendando...' : 'Reagendar'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}