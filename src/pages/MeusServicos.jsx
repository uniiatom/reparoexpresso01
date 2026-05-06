import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, XCircle, Clock, Loader2, Star, MapPin, Calendar, 
  Phone, User, ChevronDown, ChevronUp, Filter, Search, ArrowLeft, DollarSign
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_CONFIG = {
  aguardando:    { label: "Aguardando",     color: "bg-yellow-100 text-yellow-800",  icon: Clock },
  agendado:      { label: "Agendado",       color: "bg-sky-100 text-sky-800",        icon: Calendar },
  aceito:        { label: "Aceito",         color: "bg-blue-100 text-blue-800",      icon: CheckCircle2 },
  a_caminho:     { label: "A caminho",      color: "bg-purple-100 text-purple-800",  icon: Loader2 },
  em_andamento:  { label: "Em andamento",   color: "bg-indigo-100 text-indigo-800",  icon: Loader2 },
  em_espera:     { label: "Em espera",      color: "bg-orange-100 text-orange-800",  icon: Clock },
  concluido:     { label: "Concluído",      color: "bg-green-100 text-green-800",    icon: CheckCircle2 },
  cancelado:     { label: "Cancelado",      color: "bg-red-100 text-red-800",        icon: XCircle },
};

const SERVICE_LABELS = {
  eletrica: "Elétrica", hidraulica: "Hidráulica", pintura: "Pintura",
  montagem: "Montagem", reparo_geral: "Reparo Geral", alvenaria: "Alvenaria",
  fechadura: "Fechadura", ar_condicionado: "Ar Condicionado",
  limpeza_caixa_dagua: "Limpeza Caixa d'Água", limpeza_calha: "Limpeza de Calha",
  substituicao_telha: "Substituição de Telha", limpeza_telhado: "Limpeza de Telhado",
  instalacao_coifa_parede: "Coifa de Parede", instalacao_coifa_ilha: "Coifa Ilha",
  conversao_vaso_coplado: "Conversão Vaso CX Acoplada", instalacao_vaso_monobloco: "Vaso Monobloco",
  reparo_forro_gesso: "Reparo Forro de Gesso", desentupimento: "Desentupimento",
  troca_pneu: "Troca de Pneu", recarga_bateria: "Recarga de Bateria",
  conserto_pneu: "Conserto de Pneu", reboque: "Reboque",
  caca_vazamento: "Caça Vazamento", checkup: "Checkup",
  portao_eletronico: "Portão Eletrônico", interfone: "Interfone",
  rejunte: "Rejunte", pressurizador: "Pressurizador",
  alarme_cerca_eletrica: "Alarme/Cerca Elétrica", concertina: "Concertina",
  camera_cftv: "Câmera CFTV", instalacao_suporte_tv: "Suporte de TV",
  veiculo_outros: "Veículo - Outros", outros: "Outros",
};

const FILTER_OPTIONS = [
  { value: 'todos', label: 'Todos' },
  { value: 'concluido', label: 'Concluídos' },
  { value: 'cancelado', label: 'Cancelados' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'aguardando', label: 'Aguardando' },
];

function ProviderDetailModal({ service, onClose }) {
  const provider = {
    name: service.provider_name,
    phone: service.provider_phone,
    id: service.provider_id,
  };

  const { data: providerData } = useQuery({
    queryKey: ['provider-detail', service.provider_id],
    queryFn: () => base44.entities.Provider.filter({ id: service.provider_id }).then(r => r[0]),
    enabled: !!service.provider_id,
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        onClick={e => e.stopPropagation()}
        className="bg-card w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-primary/5 border-b border-border p-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 overflow-hidden flex items-center justify-center flex-shrink-0 border border-border">
              {providerData?.photo_url ? (
                <img src={providerData.photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-7 h-7 text-primary/50" />
              )}
            </div>
            <div>
              <p className="font-bold text-foreground text-lg">{provider.name || '—'}</p>
              {providerData?.rating && (
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-semibold text-foreground">{providerData.rating.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">({providerData.total_reviews || 0} aval.)</span>
                </div>
              )}
              {providerData?.city && (
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {providerData.city}, {providerData.state}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Info do Serviço */}
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">Serviço</p>
              <p className="text-sm font-semibold text-foreground">{SERVICE_LABELS[service.service_type] || service.service_type}</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">Valor Final</p>
              <p className="text-sm font-semibold text-primary">
                {service.final_price ? `R$ ${service.final_price.toFixed(2)}` : '—'}
              </p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">Data</p>
              <p className="text-sm font-semibold text-foreground">
                {new Date(service.created_date).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">Avaliação dada</p>
              {service.rating_client ? (
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(n => (
                    <Star key={n} className={cn("w-3.5 h-3.5", n <= service.rating_client ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground")} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sem avaliação</p>
              )}
            </div>
          </div>

          {service.description && (
            <div className="bg-muted/50 rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">Descrição</p>
              <p className="text-sm text-foreground">{service.description}</p>
            </div>
          )}

          {provider.phone && (
            <a
              href={`tel:${provider.phone}`}
              className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 hover:bg-green-100 transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span className="text-sm font-semibold">{provider.phone}</span>
            </a>
          )}

          <Button variant="outline" onClick={onClose} className="w-full rounded-xl h-10">
            Fechar
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

function ServiceCard({ service, onViewProvider }) {
  const [expanded, setExpanded] = useState(false);
  const statusCfg = STATUS_CONFIG[service.status] || STATUS_CONFIG.aguardando;
  const StatusIcon = statusCfg.icon;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="font-bold text-foreground text-sm">{SERVICE_LABELS[service.service_type] || service.service_type}</p>
              {service.service_number && (
                <span className="text-xs text-muted-foreground font-mono">#{service.service_number}</span>
              )}
            </div>
            <Badge className={cn("text-xs border-0", statusCfg.color)}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusCfg.label}
            </Badge>
          </div>
          {service.final_price && (
            <div className="text-right flex-shrink-0">
              <p className="text-base font-bold text-primary">R$ {service.final_price.toFixed(2)}</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3 flex-wrap">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(service.created_date).toLocaleDateString('pt-BR')}
          </span>
          {service.city && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {service.city}
            </span>
          )}
          {service.rating_client && (
            <span className="flex items-center gap-1 text-yellow-600">
              <Star className="w-3 h-3 fill-current" /> {service.rating_client.toFixed(1)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {service.provider_name && (
            <button
              onClick={() => onViewProvider(service)}
              className="flex-1 flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl px-3 py-2 text-left hover:bg-primary/10 transition-colors"
            >
              <User className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <span className="text-xs font-semibold text-primary truncate">{service.provider_name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-primary ml-auto flex-shrink-0" />
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-2"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-3 mt-3 border-t border-border space-y-2 text-xs text-muted-foreground">
                {service.description && <p><span className="font-semibold text-foreground">Descrição:</span> {service.description}</p>}
                {service.address && <p className="flex items-start gap-1"><MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />{service.address}, {service.number} — {service.neighborhood}</p>}
                {service.scheduled_date && <p className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Agendado: {service.scheduled_date} às {service.scheduled_time}</p>}
                {service.estimated_price && <p className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> Estimado: R$ {service.estimated_price.toFixed(2)}</p>}
                {service.rating_comment && <p><span className="font-semibold text-foreground">Seu comentário:</span> "{service.rating_comment}"</p>}
                {service.decline_reason && <p className="text-red-600"><span className="font-semibold">Motivo recusa:</span> {service.decline_reason}</p>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default function MeusServicos() {
  const navigate = useNavigate();
  const [user, setUser] = React.useState(null);
  const [statusFilter, setStatusFilter] = useState('todos');
  const [search, setSearch] = useState('');
  const [selectedService, setSelectedService] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(u => setUser(u)).catch(() => navigate('/'));
  }, [navigate]);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['meus-servicos', user?.email],
    queryFn: () => base44.entities.ServiceRequest.filter({ created_by: user.email }, '-created_date', 200),
    enabled: !!user?.email,
  });

  const filtered = requests.filter(r => {
    const matchStatus = statusFilter === 'todos' || r.status === statusFilter;
    const searchTerm = search.toLowerCase();
    const matchSearch = !searchTerm || 
      (SERVICE_LABELS[r.service_type] || r.service_type || '').toLowerCase().includes(searchTerm) ||
      (r.provider_name || '').toLowerCase().includes(searchTerm) ||
      (r.description || '').toLowerCase().includes(searchTerm) ||
      (r.service_number || '').toLowerCase().includes(searchTerm);
    return matchStatus && matchSearch;
  });

  const stats = {
    total: requests.length,
    concluidos: requests.filter(r => r.status === 'concluido').length,
    cancelados: requests.filter(r => r.status === 'cancelado').length,
    ativos: requests.filter(r => !['concluido', 'cancelado'].includes(r.status)).length,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Meus Serviços</h1>
            <p className="text-xs text-muted-foreground">Histórico completo de solicitações</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {[
            { label: 'Total', value: stats.total, color: 'text-foreground' },
            { label: 'Ativos', value: stats.ativos, color: 'text-blue-600' },
            { label: 'Concluídos', value: stats.concluidos, color: 'text-green-600' },
            { label: 'Cancelados', value: stats.cancelados, color: 'text-red-600' },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center">
              <p className={cn("text-xl font-bold", s.color)}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por serviço, prestador..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Filtros de status */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all border",
                statusFilter === opt.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/40"
              )}
            >
              <Filter className="w-3 h-3" />
              {opt.label}
              {opt.value !== 'todos' && (
                <span className={cn(
                  "inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold",
                  statusFilter === opt.value ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                )}>
                  {requests.filter(r => r.status === opt.value).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Lista */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground mb-1">Nenhum serviço encontrado</p>
            <p className="text-sm text-muted-foreground mb-5">
              {search ? 'Tente outros termos de busca.' : 'Você ainda não tem serviços neste filtro.'}
            </p>
            <Button onClick={() => navigate('/solicitar')} className="rounded-2xl">
              Solicitar Serviço
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(service => (
              <ServiceCard
                key={service.id}
                service={service}
                onViewProvider={setSelectedService}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal detalhe prestador */}
      <AnimatePresence>
        {selectedService && (
          <ProviderDetailModal
            service={selectedService}
            onClose={() => setSelectedService(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}