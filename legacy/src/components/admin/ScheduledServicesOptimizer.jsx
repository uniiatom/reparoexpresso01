import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Zap, MapPin, Calendar, Clock, Users, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

export default function ScheduledServicesOptimizer() {
  const queryClient = useQueryClient();
  const [optimizationResult, setOptimizationResult] = useState(null);

  const { data: scheduledRequests = [] } = useQuery({
    queryKey: ['scheduled-requests'],
    queryFn: async () => {
      const requests = await base44.entities.ServiceRequest.filter({
        modality: 'agendado'
      });
      return requests.sort((a, b) => {
        if (a.scheduled_date !== b.scheduled_date) {
          return a.scheduled_date.localeCompare(b.scheduled_date);
        }
        return (a.scheduled_time || '').localeCompare(b.scheduled_time || '');
      });
    },
    refetchInterval: 30000,
  });

  const { data: providers = [] } = useQuery({
    queryKey: ['all-providers-optimizer'],
    queryFn: () => base44.entities.Provider.filter({ is_approved: true }),
  });

  const optimizeRoute = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('optimizeServiceRoute', {});
      return response.data;
    },
    onSuccess: (data) => {
      setOptimizationResult(data);
      toast.success(`🎯 ${data.optimized_assignments} serviços otimizados em ${data.total_groups} grupos`);
      queryClient.invalidateQueries({ queryKey: ['scheduled-requests'] });
    },
    onError: (error) => {
      toast.error('Erro ao otimizar rota');
      console.error(error);
    },
  });

  const assignService = useMutation({
    mutationFn: async ({ request_id, provider_id }) => {
      const response = await base44.functions.invoke('assignServiceToProvider', {
        request_id,
        provider_id
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`✅ ${data.message}`);
      queryClient.invalidateQueries({ queryKey: ['scheduled-requests'] });
      setOptimizationResult(null);
    },
  });

  // Group by date and city
  const groupedServices = {};
  scheduledRequests.forEach(req => {
    const key = `${req.scheduled_date}_${req.city}`;
    if (!groupedServices[key]) {
      groupedServices[key] = {
        date: req.scheduled_date,
        city: req.city,
        services: []
      };
    }
    groupedServices[key].services.push(req);
  });

  const pendingScheduled = scheduledRequests.filter(r => r.status === 'aguardando');
  const acceptedScheduled = scheduledRequests.filter(r => r.status === 'aceito');

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Agendados", value: scheduledRequests.length, icon: Calendar, color: "text-blue-600" },
          { label: "Pendentes", value: pendingScheduled.length, icon: Clock, color: "text-yellow-600" },
          { label: "Aceitos", value: acceptedScheduled.length, icon: Zap, color: "text-green-600" },
          { label: "Prestadores", value: providers.length, icon: Users, color: "text-primary" },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4 text-center">
              <stat.icon className={cn("w-4 h-4 mx-auto mb-1", stat.color)} />
              <p className={cn("text-2xl font-bold", stat.color)}>{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Optimization Button */}
      <Button
        onClick={() => optimizeRoute.mutate()}
        disabled={optimizeRoute.isPending || pendingScheduled.length === 0}
        className="w-full h-12 rounded-2xl font-bold text-base bg-primary text-primary-foreground"
      >
        {optimizeRoute.isPending ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Otimizando...
          </>
        ) : (
          <>
            <TrendingUp className="w-5 h-5 mr-2" />
            Otimizar Rotas e Agrupar Serviços
          </>
        )}
      </Button>

      <Tabs defaultValue="grouped" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="grouped">Agrupados por Data/Cidade</TabsTrigger>
          <TabsTrigger value="optimization">
            {optimizationResult && `Otimização (${optimizationResult.optimized_assignments})`}
          </TabsTrigger>
        </TabsList>

        {/* Grouped View */}
        <TabsContent value="grouped" className="space-y-4">
          {Object.entries(groupedServices).length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum serviço agendado</p>
          ) : (
            Object.entries(groupedServices).map(([key, group]) => (
              <Card key={key}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {new Date(group.date).toLocaleDateString('pt-BR')} - {group.city}
                    <Badge variant="outline">{group.services.length} serviços</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {group.services.map(service => (
                    <motion.div
                      key={service.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border border-border rounded-xl p-3 space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-foreground text-sm">{service.client_name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {service.scheduled_time || 'Não especificado'}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" /> {service.address}
                          </p>
                        </div>
                        <Badge
                          className={cn(
                            "text-xs border-0",
                            service.status === 'aguardando' ? 'bg-yellow-100 text-yellow-800' :
                            service.status === 'aceito' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          )}
                        >
                          {service.status === 'aguardando' ? 'Pendente' : 'Aceito'}
                        </Badge>
                      </div>

                      {service.provider_name && (
                        <div className="bg-primary/5 rounded p-2">
                          <p className="text-xs text-primary font-semibold">🔧 {service.provider_name}</p>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Optimization Results */}
        <TabsContent value="optimization">
          {!optimizationResult ? (
            <div className="text-center text-muted-foreground py-8">
              <Zap className="w-12 h-12 mx-auto opacity-30 mb-3" />
              <p>Clique em "Otimizar Rotas" para gerar sugestões</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-900">
                  <strong>✨ Otimização concluída:</strong> {optimizationResult.optimized_assignments} serviços podem ser agrupados
                </p>
              </div>

              {optimizationResult.assignments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhuma oportunidade de otimização encontrada</p>
              ) : (
                optimizationResult.assignments.map((assignment, idx) => {
                  const request = scheduledRequests.find(r => r.id === assignment.request_id);
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <p className="font-semibold text-foreground">{request?.client_name}</p>
                              <p className="text-sm text-muted-foreground mt-1">{request?.address}</p>
                              <div className="flex gap-2 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {assignment.distance_km.toFixed(1)} km
                                </Badge>
                                <Badge className="text-xs bg-blue-100 text-blue-800 border-0">
                                  Grupo de {assignment.cluster_size}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          <div className="bg-green-50 rounded-lg p-3 mb-3">
                            <p className="text-sm font-bold text-green-700">
                              🎯 Sugestão: {assignment.provider_name}
                            </p>
                            <p className="text-xs text-green-600 mt-1">
                              Eficiência de rota: {(assignment.efficiency_score * 100).toFixed(0)}%
                            </p>
                          </div>

                          <Button
                            onClick={() => assignService.mutate({
                              request_id: assignment.request_id,
                              provider_id: assignment.provider_id
                            })}
                            disabled={assignService.isPending}
                            className="w-full rounded-xl h-9 text-sm font-semibold"
                          >
                            {assignService.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                            Aceitar Sugestão
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}