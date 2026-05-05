import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, DollarSign, CheckCircle2, Clock, MapPin, Star, TrendingUp, AlertCircle, X } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from 'react-router-dom';
import ProviderTicketForm from '@/components/ProviderTicketForm';
import ProviderEarningsWithdrawal from '@/components/ProviderEarningsWithdrawal';
import ServiceRefusalForm from '@/components/ServiceRefusalForm';
import ServiceCompletionModal from '@/components/ServiceCompletionModal';

export default function ProviderDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [provider, setProvider] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [refusalService, setRefusalService] = useState(null);
  const [completionService, setCompletionService] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
    }).catch(() => navigate('/'));
  }, [navigate]);

  // Fetch provider data
  const { data: providers } = useQuery({
    queryKey: ['provider', user?.email],
    queryFn: () => base44.entities.Provider.filter({ user_id: user?.id }),
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (providers?.length > 0) {
      setProvider(providers[0]);
    }
  }, [providers]);

  // Fetch accepted services
  const { data: acceptedServices = [] } = useQuery({
    queryKey: ['acceptedServices', provider?.id],
    queryFn: () => base44.entities.ServiceRequest.filter({ 
      provider_id: provider?.id,
      status: { $in: ['aceito', 'a_caminho', 'em_andamento', 'concluido'] }
    }),
    enabled: !!provider?.id,
  });

  // Fetch scheduled services
  const { data: scheduledServices = [] } = useQuery({
    queryKey: ['scheduledServices', provider?.id],
    queryFn: () => base44.entities.ServiceRequest.filter({ 
      provider_id: provider?.id,
      status: 'agendado'
    }),
    enabled: !!provider?.id,
  });

  // Fetch payment history
  const { data: payments = [] } = useQuery({
    queryKey: ['payments', provider?.id],
    queryFn: () => base44.entities.ServiceRequest.filter({ 
      provider_id: provider?.id,
      final_price: { $exists: true }
    }),
    enabled: !!provider?.id,
  });

  // Fetch availability
  const { data: availability = [] } = useQuery({
    queryKey: ['availability', provider?.id],
    queryFn: () => base44.entities.ProviderAvailability.filter({ provider_id: provider?.id }),
    enabled: !!provider?.id,
  });

  if (!user || !provider) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  // Calculate stats
  const totalEarnings = payments.reduce((sum, p) => sum + (p.final_price || 0), 0);
  const completedServices = acceptedServices.filter(s => s.status === 'concluido').length;
  const activeServices = acceptedServices.filter(s => ['a_caminho', 'em_andamento'].includes(s.status)).length;
  const avgRating = provider.rating || 0;

  const statusColors = {
    aceito: 'bg-blue-100 text-blue-700',
    a_caminho: 'bg-yellow-100 text-yellow-700',
    em_andamento: 'bg-purple-100 text-purple-700',
    concluido: 'bg-green-100 text-green-700',
    cancelado: 'bg-red-100 text-red-700',
  };

  const statusLabels = {
    aceito: 'Aceito',
    a_caminho: 'A caminho',
    em_andamento: 'Em andamento',
    concluido: 'Concluído',
    cancelado: 'Cancelado',
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Modal de Recusa */}
      {refusalService && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-background rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
          >
            <div className="sticky top-0 bg-background border-b border-border p-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Registrar Recusa Técnica</h2>
              <button
                onClick={() => setRefusalService(null)}
                className="p-1 hover:bg-accent rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="p-6">
              <ServiceRefusalForm
                serviceRequest={refusalService}
                onSuccess={() => setRefusalService(null)}
              />
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal de Conclusão */}
      {completionService && (
        <ServiceCompletionModal
          service={completionService}
          onSuccess={() => setCompletionService(null)}
          onCancel={() => setCompletionService(null)}
        />
      )}

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-1">Painel do Prestador</h1>
              <p className="text-muted-foreground">Gerenciar serviços, pagamentos e disponibilidade</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-lg font-bold text-foreground">{avgRating.toFixed(1)}</span>
              </div>
              <p className="text-xs text-muted-foreground">{provider.total_reviews || 0} avaliações</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="bg-card border-border">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Ganhos</p>
                      <p className="text-2xl font-bold text-foreground">R$ {totalEarnings.toFixed(2)}</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-primary opacity-20" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="bg-card border-border">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Serviços Ativos</p>
                      <p className="text-2xl font-bold text-foreground">{activeServices}</p>
                    </div>
                    <Clock className="w-8 h-8 text-primary opacity-20" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="bg-card border-border">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Concluídos</p>
                      <p className="text-2xl font-bold text-foreground">{completedServices}</p>
                    </div>
                    <CheckCircle2 className="w-8 h-8 text-green-500 opacity-20" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card className="bg-card border-border">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Total Serviços</p>
                      <p className="text-2xl font-bold text-foreground">{acceptedServices.length}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-primary opacity-20" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>

        {/* Main Tabs */}
         <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6 mb-6">
              <TabsTrigger value="scheduled">Agendados</TabsTrigger>
              <TabsTrigger value="overview">Aceitos</TabsTrigger>
              <TabsTrigger value="earnings">Ganhos</TabsTrigger>
              <TabsTrigger value="payments">Pagamentos</TabsTrigger>
              <TabsTrigger value="availability">Disponibilidade</TabsTrigger>
              <TabsTrigger value="support">Suporte</TabsTrigger>
            </TabsList>

          {/* Tab: Serviços Agendados */}
          <TabsContent value="scheduled" className="space-y-4">
            {scheduledServices.length === 0 ? (
              <Card className="bg-muted/50 border-border">
                <CardContent className="pt-6 text-center">
                  <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground text-sm">Nenhum serviço agendado</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {scheduledServices.map((service, idx) => (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card className="bg-card border-border hover:shadow-lg transition-all border-blue-200 bg-blue-50">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-foreground">{service.service_type}</h3>
                              <Badge className="bg-blue-100 text-blue-700">Agendado</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">{service.description}</p>
                            <div className="flex flex-col gap-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {service.address}, {service.city} - {service.state}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> {new Date(service.scheduled_date).toLocaleDateString('pt-BR')} às {service.scheduled_time}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            {service.estimated_price && (
                              <div>
                                <p className="text-xs text-muted-foreground">Valor estimado</p>
                                <p className="text-lg font-bold text-primary">R$ {Number(service.estimated_price).toFixed(2)}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab: Serviços Aceitos */}
          <TabsContent value="overview" className="space-y-4">
            {acceptedServices.length === 0 ? (
              <Card className="bg-muted/50 border-border">
                <CardContent className="pt-6 text-center">
                  <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground text-sm">Nenhum serviço aceito ainda</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {acceptedServices.map((service, idx) => (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card className="bg-card border-border hover:shadow-lg transition-all">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between gap-4">
                           <div className="flex-1">
                             <div className="flex items-center gap-2 mb-2">
                               <h3 className="font-semibold text-foreground">{service.service_type}</h3>
                               <Badge className={statusColors[service.status]}>
                                 {statusLabels[service.status]}
                               </Badge>
                             </div>
                             <p className="text-sm text-muted-foreground mb-3">{service.description}</p>
                             <div className="flex items-center gap-4 text-xs text-muted-foreground">
                               <span className="flex items-center gap-1">
                                 <MapPin className="w-3 h-3" /> {service.city}, {service.state}
                               </span>
                               <span className="flex items-center gap-1">
                                 <Calendar className="w-3 h-3" /> {new Date(service.created_date).toLocaleDateString('pt-BR')}
                               </span>
                             </div>
                           </div>
                           <div className="text-right space-y-2">
                             {service.final_price && (
                               <div>
                                 <p className="text-xs text-muted-foreground">Valor final</p>
                                 <p className="text-lg font-bold text-primary">R$ {service.final_price.toFixed(2)}</p>
                               </div>
                             )}
                             {service.status === 'em_andamento' && (
                               <Button 
                                 size="sm"
                                 onClick={() => setCompletionService(service)}
                                 className="w-full h-8 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                               >
                                 Concluir Serviço
                               </Button>
                             )}
                             {(service.status === 'aceito' || service.status === 'a_caminho') && (
                               <Button 
                                 size="sm"
                                 variant="outline"
                                 onClick={() => setRefusalService(service)}
                                 className="w-full h-8 text-xs rounded-lg border-red-200 text-red-600 hover:bg-red-50"
                               >
                                 Recusar Serviço
                               </Button>
                             )}
                           </div>
                         </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab: Ganhos & Saques */}
          <TabsContent value="earnings" className="space-y-4">
            <ProviderEarningsWithdrawal
              providerId={provider.id}
              providerName={provider.name}
            />
          </TabsContent>

          {/* Tab: Histórico de Pagamentos */}
          <TabsContent value="payments" className="space-y-4">
            {payments.length === 0 ? (
              <Card className="bg-muted/50 border-border">
                <CardContent className="pt-6 text-center">
                  <DollarSign className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground text-sm">Nenhum pagamento recebido ainda</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {payments.map((payment, idx) => (
                  <motion.div
                    key={payment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card className="bg-card border-border">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-foreground mb-1">{payment.service_type}</h3>
                            <p className="text-xs text-muted-foreground">
                              {new Date(payment.updated_date).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground mb-1">Valor recebido</p>
                            <p className="text-2xl font-bold text-green-600">R$ {payment.final_price.toFixed(2)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab: Disponibilidade */}
          <TabsContent value="availability" className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Horários de Funcionamento</CardTitle>
                <CardDescription>Configure quando você está disponível para serviços</CardDescription>
              </CardHeader>
              <CardContent>
                {availability.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-muted-foreground text-sm mb-4">Nenhuma disponibilidade configurada</p>
                    <Button onClick={() => navigate('/prestador/horarios')} className="rounded-2xl">
                      Configurar Horários
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[0, 1, 2, 3, 4, 5, 6].map(day => {
                      const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
                      const dayAvail = availability.filter(a => a.day_of_week === day);
                      
                      return (
                        <div key={day} className="flex items-center justify-between p-4 rounded-2xl border border-border bg-muted/50">
                          <span className="font-medium text-foreground">{dayNames[day]}</span>
                          <div className="text-right">
                            {dayAvail.length > 0 ? (
                              <div>
                                {dayAvail.map(av => (
                                  <p key={av.id} className="text-xs text-primary font-semibold">
                                    {av.start_time} - {av.end_time} ({av.max_slots_per_day} slots)
                                  </p>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">Indisponível</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {availability.length > 0 && (
              <Button 
                variant="outline" 
                onClick={() => navigate('/prestador/horarios')}
                className="w-full rounded-2xl"
              >
                Editar Horários
              </Button>
              )}
              </TabsContent>

              {/* Tab: Suporte Técnico */}
              <TabsContent value="support" className="space-y-4">
              <ProviderTicketForm 
               providerId={provider.id}
               providerName={provider.name}
               providerEmail={user.email}
              />
              </TabsContent>
              </Tabs>
              </div>
              </div>
              );
              }