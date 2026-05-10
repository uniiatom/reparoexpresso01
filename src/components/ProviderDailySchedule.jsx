import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, Clock, MapPin, Phone, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_STEPS = [
  { key: 'a_caminho', label: '🚗 Em deslocamento', color: 'bg-orange-100 text-orange-700' },
  { key: 'em_andamento', label: '🔧 Iniciado', color: 'bg-blue-100 text-blue-700' },
  { key: 'concluido', label: '✓ Finalizado', color: 'bg-green-100 text-green-700' },
];

export default function ProviderDailySchedule() {
  const [user, setUser] = useState(null);
  const [todayServices, setTodayServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const fetchTodayServices = async () => {
      setLoading(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

        const services = await base44.entities.ServiceRequest.filter(
          {
            provider_id: user.id,
            scheduled_date: today,
            status: { $ne: 'cancelado' }
          },
          'scheduled_time',
          50
        );

        setTodayServices(services);
      } catch (error) {
        console.error('Erro ao buscar serviços do dia:', error);
        toast.error('Erro ao carregar serviços');
      } finally {
        setLoading(false);
      }
    };

    fetchTodayServices();
    const unsub = base44.entities.ServiceRequest.subscribe((event) => {
      if (event.data?.provider_id === user.id) {
        const today = new Date().toISOString().split('T')[0];
        if (event.data.scheduled_date === today && event.data.status !== 'cancelado') {
          if (event.type === 'update' || event.type === 'create') {
            setTodayServices(prev => {
              const idx = prev.findIndex(s => s.id === event.id);
              if (idx >= 0) return prev.map(s => s.id === event.id ? event.data : s);
              return [event.data, ...prev].sort((a, b) => 
                (a.scheduled_time || '').localeCompare(b.scheduled_time || '')
              );
            });
          }
        }
      }
    });

    return unsub;
  }, [user?.id]);

  const handleStatusChange = async (serviceId, newStatus) => {
    setUpdatingId(serviceId);
    try {
      await base44.entities.ServiceRequest.update(serviceId, { status: newStatus });
      toast.success('Status atualizado');
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const serviceLabels = {
    eletrica: 'Elétrica', hidraulica: 'Hidráulica', pintura: 'Pintura',
    reparo_geral: 'Reparo Geral', montagem: 'Montagem', alvenaria: 'Alvenaria',
    fechadura: 'Fechadura', ar_condicionado: 'Ar Condicionado', outros: 'Outros',
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Agenda de Hoje</h2>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </p>
        </div>
        <div className="text-3xl font-bold text-primary">{todayServices.length}</div>
      </div>

      {/* Lista de serviços */}
      {todayServices.length === 0 ? (
        <div className="bg-card rounded-3xl border border-border p-8 text-center">
          <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground font-semibold">Nenhum serviço agendado para hoje</p>
        </div>
      ) : (
        <div className="space-y-3">
          {todayServices.map((service) => (
            <div key={service.id} className="bg-card rounded-2xl border border-border p-4 space-y-3">
              {/* Header do serviço */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-foreground text-lg">
                      {serviceLabels[service.service_type] || service.service_type}
                    </p>
                    <span className="text-xs font-mono font-bold text-primary/70">#{service.service_number}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{service.description}</p>
                </div>
              </div>

              {/* Horário e cliente */}
              <div className="space-y-2 border-t border-border pt-3">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="font-semibold">{service.scheduled_time || 'Sem horário definido'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground text-xs">{service.address}</span>
                </div>
                {service.client_phone && (
                  <div className="flex items-center gap-2">
                    <a 
                      href={`https://wa.me/55${service.client_phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700 font-semibold"
                    >
                      <Phone className="w-3 h-3" />
                      {service.client_name}
                    </a>
                  </div>
                )}
              </div>

              {/* Status atual */}
              <div className="border-t border-border pt-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2">MUDAR STATUS</p>
                <div className="grid grid-cols-3 gap-2">
                  {STATUS_STEPS.map((step) => (
                    <Button
                      key={step.key}
                      onClick={() => handleStatusChange(service.id, step.key)}
                      disabled={updatingId === service.id}
                      variant={service.status === step.key ? 'default' : 'outline'}
                      className={`rounded-xl text-xs font-semibold h-9 ${
                        service.status === step.key 
                          ? 'bg-primary text-primary-foreground' 
                          : 'text-muted-foreground'
                      }`}
                    >
                      {updatingId === service.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        step.label
                      )}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Valor do serviço */}
              {service.estimated_price && (
                <div className="border-t border-border pt-3 bg-primary/5 rounded-xl p-2 text-center">
                  <p className="text-xs text-muted-foreground">Valor estimado</p>
                  <p className="text-lg font-bold text-primary">R$ {service.estimated_price.toFixed(2)}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}