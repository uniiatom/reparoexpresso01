import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Filter, 
  Calendar as CalendarIcon, 
  User, 
  Wrench, 
  Clock, 
  LayoutList, 
  CalendarDays,
  ChevronRight,
  UserCheck
} from "lucide-react";
import { format, parseISO, isSameDay, isAfter, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import ScheduledCalendar from '../components/admin/ScheduledCalendar';

const STATUS_LABELS = {
  aguardando: 'Aguardando',
  aceito: 'Aceito',
  a_caminho: 'A caminho',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
  agendado: 'Agendado',
};

const STATUS_COLORS = {
  aguardando: 'bg-yellow-100 text-yellow-800',
  aceito: 'bg-blue-100 text-blue-800',
  a_caminho: 'bg-cyan-100 text-cyan-800',
  em_andamento: 'bg-purple-100 text-purple-800',
  concluido: 'bg-green-100 text-green-800',
  cancelado: 'bg-red-100 text-red-800',
  agendado: 'bg-emerald-100 text-emerald-800',
};

const SERVICE_LABELS = {
  eletrica: "Elétrica",
  hidraulica: "Hidráulica",
  pintura: "Pintura",
  reparo_geral: "Reparo Geral",
  montagem: "Montagem",
  alvenaria: "Alvenaria",
  fechadura: "Fechadura",
  ar_condicionado: "Ar Condicionado",
  limpeza_caixa_dagua: "Caixa D'água",
  limpeza_calha: "Calha",
  desentupimento: "Desentupimento",
  reboque: "Reboque",
  outros: "Outros",
};

export default function ProviderAgenda() {
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [filters, setFilters] = useState({
    providerId: 'all',
    serviceType: 'all',
    status: 'all',
    clientSearch: '',
    date: '',
  });

  // Fetch all service requests
  const { data: requests = [], isLoading: isLoadingRequests } = useQuery({
    queryKey: ['agenda-requests'],
    queryFn: () => base44.entities.ServiceRequest.list('-created_date', 1000),
  });

  // Fetch all providers for the filter
  const { data: providers = [] } = useQuery({
    queryKey: ['agenda-providers'],
    queryFn: () => base44.entities.Provider.list(),
  });

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      const matchProvider = filters.providerId === 'all' || req.provider_id === filters.providerId;
      const matchService = filters.serviceType === 'all' || req.service_type === filters.serviceType;
      const matchStatus = filters.status === 'all' || req.status === filters.status;
      const matchClient = !filters.clientSearch || 
        req.client_name?.toLowerCase().includes(filters.clientSearch.toLowerCase()) ||
        req.client_phone?.includes(filters.clientSearch);
      
      let matchDate = true;
      if (filters.date) {
        if (req.scheduled_date) {
          matchDate = req.scheduled_date === filters.date;
        } else {
          matchDate = false;
        }
      }

      return matchProvider && matchService && matchStatus && matchClient && matchDate;
    });
  }, [requests, filters]);

  const serviceTypes = useMemo(() => {
    const types = requests.map(r => r.service_type).filter(Boolean);
    return [...new Set(types)];
  }, [requests]);

  const stats = useMemo(() => {
    const scheduled = requests.filter(r => r.status === 'agendado').length;
    const active = requests.filter(r => ['aceito', 'a_caminho', 'em_andamento'].includes(r.status)).length;
    const pending = requests.filter(r => r.status === 'aguardando').length;
    return { scheduled, active, pending };
  }, [requests]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Agenda de Prestadores</h1>
          <p className="text-muted-foreground mt-1">Gerencie todos os atendimentos e horários do sistema</p>
        </div>
        <div className="flex items-center gap-2 bg-muted p-1 rounded-xl">
          <Button 
            variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
            size="sm" 
            onClick={() => setViewMode('list')}
            className="rounded-lg gap-2"
          >
            <LayoutList className="w-4 h-4" /> Lista
          </Button>
          <Button 
            variant={viewMode === 'calendar' ? 'secondary' : 'ghost'} 
            size="sm" 
            onClick={() => setViewMode('calendar')}
            className="rounded-lg gap-2"
          >
            <CalendarDays className="w-4 h-4" /> Calendário
          </Button>
        </div>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-emerald-100 bg-emerald-50/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <CalendarIcon className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-800">Agendados</p>
              <p className="text-2xl font-bold text-emerald-900">{stats.scheduled}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-100 bg-blue-50/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-800">Em Atendimento</p>
              <p className="text-2xl font-bold text-blue-900">{stats.active}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-100 bg-yellow-50/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-yellow-800">Aguardando</p>
              <p className="text-2xl font-bold text-yellow-900">{stats.pending}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {viewMode === 'calendar' ? (
        <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
          <ScheduledCalendar />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Filters */}
          <Card className="border-border shadow-sm rounded-3xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4 text-primary font-bold">
                <Filter className="w-4 h-4" /> Filtros
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase ml-1">Prestador</label>
                  <Select value={filters.providerId} onValueChange={(val) => setFilters(f => ({ ...f, providerId: val }))}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Todos os prestadores" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os prestadores</SelectItem>
                      {providers.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase ml-1">Tipo de Serviço</label>
                  <Select value={filters.serviceType} onValueChange={(val) => setFilters(f => ({ ...f, serviceType: val }))}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Todos os serviços" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os serviços</SelectItem>
                      {serviceTypes.map(type => (
                        <SelectItem key={type} value={type}>{SERVICE_LABELS[type] || type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase ml-1">Status</label>
                  <Select value={filters.status} onValueChange={(val) => setFilters(f => ({ ...f, status: val }))}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      {Object.entries(STATUS_LABELS).map(([val, label]) => (
                        <SelectItem key={val} value={val}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase ml-1">Data Agendada</label>
                  <Input 
                    type="date" 
                    className="rounded-xl"
                    value={filters.date}
                    onChange={(e) => setFilters(f => ({ ...f, date: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase ml-1">Cliente / Telefone</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="Buscar cliente..." 
                      className="pl-9 rounded-xl"
                      value={filters.clientSearch}
                      onChange={(e) => setFilters(f => ({ ...f, clientSearch: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              
              {(filters.providerId !== 'all' || filters.serviceType !== 'all' || filters.status !== 'all' || filters.clientSearch || filters.date) && (
                <div className="flex justify-end mt-4">
                  <Button 
                    variant="link" 
                    size="sm" 
                    onClick={() => setFilters({ providerId: 'all', serviceType: 'all', status: 'all', clientSearch: '', date: '' })}
                    className="text-xs text-muted-foreground"
                  >
                    Limpar filtros
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results List */}
          <div className="space-y-4">
            {isLoadingRequests ? (
              <div className="text-center py-20">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Carregando atendimentos...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-20 bg-card border border-dashed border-border rounded-3xl">
                <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold">Nenhum atendimento encontrado</h3>
                <p className="text-muted-foreground">Tente ajustar seus filtros para encontrar o que procura</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredRequests.map(req => (
                  <RequestCard key={req.id} request={req} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RequestCard({ request }) {
  const navigate = useNavigate();
  const date = request.scheduled_date ? parseISO(request.scheduled_date) : null;
  const time = request.scheduled_time;

  return (
    <Card className="group hover:shadow-md transition-all border-border overflow-hidden rounded-2xl">
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row h-full">
          {/* Side Info (Date) */}
          <div className={cn(
            "sm:w-32 p-4 flex flex-col items-center justify-center text-center gap-1 border-b sm:border-b-0 sm:border-r border-border",
            request.status === 'agendado' ? 'bg-emerald-50/50' : 'bg-muted/30'
          )}>
            {date ? (
              <>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">{format(date, 'MMM', { locale: ptBR })}</span>
                <span className="text-2xl font-black text-foreground">{format(date, 'dd')}</span>
                <span className="text-[10px] font-medium text-muted-foreground">{format(date, 'EEEE', { locale: ptBR })}</span>
                {time && (
                  <div className="mt-2 px-2 py-0.5 bg-background rounded-full border border-border text-[11px] font-bold text-primary flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {time}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center mb-1">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <span className="text-[10px] font-bold text-yellow-700 uppercase">Imediato</span>
              </>
            )}
          </div>

          {/* Main Info */}
          <div className="flex-1 p-5 space-y-3 relative">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={cn("text-[10px] px-2 py-0 border-0 uppercase font-bold", STATUS_COLORS[request.status])}>
                    {STATUS_LABELS[request.status] || request.status}
                  </Badge>
                  {request.service_number && (
                    <span className="text-[10px] font-mono text-muted-foreground">#{request.service_number}</span>
                  )}
                </div>
                <h3 className="text-base font-bold text-foreground leading-tight">
                  {SERVICE_LABELS[request.service_type] || request.service_type}
                </h3>
              </div>
              <div className="text-right">
                {request.final_price ? (
                  <span className="text-lg font-black text-primary">R$ {request.final_price.toLocaleString('pt-BR')}</span>
                ) : (
                  <span className="text-xs text-muted-foreground italic">Preço pendente</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="font-semibold text-foreground truncate">{request.client_name}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <div className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
                  <Wrench className="w-3.5 h-3.5 text-secondary-foreground" />
                </div>
                <span className={cn(
                  "font-medium truncate",
                  request.provider_name ? "text-foreground" : "text-red-500 italic text-xs"
                )}>
                  {request.provider_name || 'Sem prestador alocado'}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-border flex items-center justify-between mt-auto">
              <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                {request.address}{request.city ? `, ${request.city}` : ''}
              </p>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate(`/acompanhar/${request.id}`)}
                className="h-7 text-[11px] font-bold text-primary gap-1 group-hover:bg-primary/5 rounded-lg"
              >
                Ver detalhes <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}