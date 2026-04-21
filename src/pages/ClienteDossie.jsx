import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Wrench, MapPin, Calendar, Star, CheckSquare, Image, User, Phone, ChevronDown, ChevronUp, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const SERVICE_LABELS = {
  eletrica: "Elétrica", hidraulica: "Hidráulica", pintura: "Pintura",
  reparo_geral: "Reparo Geral", montagem: "Montagem", alvenaria: "Alvenaria",
  fechadura: "Fechadura", ar_condicionado: "Ar Condicionado",
  limpeza_caixa_dagua: "Limpeza Caixa d'Água", desentupimento: "Desentupimento",
  troca_pneu: "Troca de Pneu", recarga_bateria: "Recarga de Bateria",
  conserto_pneu: "Conserto de Pneu", reboque: "Reboque",
  instalacao_suporte_tv: "Suporte de TV", reparo_forro_gesso: "Forro de Gesso",
  limpeza_calha: "Limpeza de Calha", limpeza_telhado: "Limpeza de Telhado",
  outros: "Outros",
};

const STATUS_CONFIG = {
  aguardando:   { label: 'Aguardando',   color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  agendado:     { label: 'Agendado',     color: 'bg-blue-100 text-blue-800 border-blue-200' },
  aceito:       { label: 'Aceito',       color: 'bg-blue-100 text-blue-800 border-blue-200' },
  a_caminho:    { label: 'A caminho',    color: 'bg-purple-100 text-purple-800 border-purple-200' },
  em_andamento: { label: 'Em andamento', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  em_espera:    { label: 'Em espera',    color: 'bg-slate-100 text-slate-700 border-slate-200' },
  concluido:    { label: 'Concluído',    color: 'bg-green-100 text-green-800 border-green-200' },
  cancelado:    { label: 'Cancelado',    color: 'bg-red-100 text-red-800 border-red-200' },
};

function PhotoLightbox({ photos, initialIndex, onClose }) {
  const [current, setCurrent] = useState(initialIndex);
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 p-2 text-white hover:text-gray-300">
        <X className="w-7 h-7" />
      </button>
      <div className="relative max-w-lg w-full px-4" onClick={e => e.stopPropagation()}>
        <img src={photos[current]} alt="" className="w-full max-h-[80vh] object-contain rounded-2xl" />
        {photos.length > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {photos.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className={cn("w-2.5 h-2.5 rounded-full transition-all", i === current ? "bg-white" : "bg-white/40")} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ServiceCard({ service }) {
  const [expanded, setExpanded] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const status = STATUS_CONFIG[service.status] || STATUS_CONFIG.aguardando;
  const label = SERVICE_LABELS[service.service_type] || service.service_type;

  const allPhotos = [
    ...(service.problem_photos || []),
    ...(service.checklist?.photos || []),
    ...(service.additional_points?.flatMap(p => p.photos || []) || []),
  ];

  const checklistItems = service.checklist?.items || [];
  const checkedCount = checklistItems.filter(i => i.checked).length;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-3 p-4 text-left hover:bg-accent/50 transition-colors">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Wrench className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-foreground text-sm">{label}</p>
            <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", status.color)}>
              {status.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {service.service_number || `#${service.id?.slice(0, 8).toUpperCase()}`}
            {service.created_date && ` · ${format(new Date(service.created_date), 'dd/MM/yyyy')}`}
          </p>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border">

          {/* Descrição */}
          {service.description && (
            <div className="pt-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Descrição</p>
              <p className="text-sm text-foreground">{service.description}</p>
            </div>
          )}

          {/* Prestador */}
          {service.provider_name && (
            <div className="bg-muted/50 rounded-xl p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Prestador</p>
              <ProviderInfo providerId={service.provider_id} providerName={service.provider_name} providerPhone={service.provider_phone} />
            </div>
          )}

          {/* Endereço */}
          {service.address && (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-sm text-foreground">
                {service.address}{service.number ? `, ${service.number}` : ''}
                {service.neighborhood ? ` — ${service.neighborhood}` : ''}
                {service.city ? `, ${service.city}` : ''}
              </p>
            </div>
          )}

          {/* Valor */}
          {(service.final_price || service.estimated_price) && (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2">
              <p className="text-sm font-semibold text-green-800">Valor {service.final_price ? 'final' : 'estimado'}</p>
              <p className="text-lg font-black text-green-700">R$ {(service.final_price || service.estimated_price).toFixed(2)}</p>
            </div>
          )}

          {/* Avaliação */}
          {service.rating_client && (
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-muted-foreground">Sua avaliação:</p>
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} className={cn("w-4 h-4", i <= service.rating_client ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground")} />
                ))}
              </div>
              {service.rating_comment && <p className="text-xs text-muted-foreground italic">"{service.rating_comment}"</p>}
            </div>
          )}

          {/* Checklist */}
          {checklistItems.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                <CheckSquare className="w-3.5 h-3.5" /> Checklist ({checkedCount}/{checklistItems.length})
              </p>
              <div className="space-y-1.5">
                {checklistItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={cn("w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border",
                      item.checked ? "bg-green-500 border-green-500" : "border-border bg-background")}>
                      {item.checked && <span className="text-white text-[9px] font-black">✓</span>}
                    </div>
                    <p className={cn("text-sm", item.checked ? "text-foreground" : "text-muted-foreground")}>{item.label}</p>
                  </div>
                ))}
              </div>
              {service.checklist?.notes && (
                <div className="mt-2 bg-muted/50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Observações do checklist</p>
                  <p className="text-sm text-foreground">{service.checklist.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Fotos */}
          {allPhotos.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                <Image className="w-3.5 h-3.5" /> Fotos ({allPhotos.length})
              </p>
              <div className="grid grid-cols-3 gap-2">
                {allPhotos.map((url, i) => (
                  <button key={i} onClick={() => setLightbox(i)}
                    className="aspect-square rounded-xl overflow-hidden border border-border hover:opacity-80 transition-opacity">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pontos adicionais */}
          {service.additional_points?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Pontos adicionais</p>
              <div className="space-y-2">
                {service.additional_points.map((pt, i) => (
                  <div key={i} className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                    <p className="text-sm font-semibold text-orange-900">{pt.title}</p>
                    {pt.description && <p className="text-xs text-orange-700 mt-0.5">{pt.description}</p>}
                    {pt.extra_cost > 0 && <p className="text-xs font-bold text-orange-800 mt-1">+ R$ {pt.extra_cost.toFixed(2)}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {lightbox !== null && <PhotoLightbox photos={allPhotos} initialIndex={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}

function ProviderInfo({ providerId, providerName, providerPhone }) {
  const { data: provider } = useQuery({
    queryKey: ['provider-card', providerId],
    queryFn: () => providerId
      ? base44.entities.Provider.filter({ id: providerId }).then(r => r[0] || null)
      : null,
    enabled: !!providerId,
  });

  return (
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-xl bg-primary/10 overflow-hidden flex items-center justify-center flex-shrink-0 border border-border">
        {provider?.photo_url
          ? <img src={provider.photo_url} alt={providerName} className="w-full h-full object-cover" />
          : <User className="w-6 h-6 text-primary" />}
      </div>
      {provider?.photo_body_url && (
        <div className="w-12 h-12 rounded-xl overflow-hidden border border-border flex-shrink-0">
          <img src={provider.photo_body_url} alt="corpo" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-foreground text-sm">{providerName}</p>
        {providerPhone && (
          <div className="flex items-center gap-1 mt-0.5">
            <Phone className="w-3 h-3 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">{providerPhone}</p>
          </div>
        )}
        {provider && (
          <div className="flex items-center gap-1 mt-0.5">
            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            <span className="text-xs text-foreground font-medium">{provider.rating?.toFixed(1) || '5.0'}</span>
            <span className="text-xs text-muted-foreground">({provider.total_reviews || 0} aval.)</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ClienteDossie() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('todos');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => navigate('/')).finally(() => setUserLoading(false));
  }, [navigate]);

  const { data: clientProfile } = useQuery({
    queryKey: ['client-profile-dossie', user?.id],
    queryFn: () => base44.entities.Client.filter({ user_id: user.id }).then(r => r[0] || null),
    enabled: !!user?.id,
  });

  const { data: serviceRequests = [], isLoading } = useQuery({
    queryKey: ['dossie-services', user?.email],
    queryFn: async () => {
      const all = await base44.entities.ServiceRequest.list('-created_date', 200);
      return all.filter(s => s.created_by === user.email);
    },
    enabled: !!user?.email,
  });

  const filtered = statusFilter === 'todos'
    ? serviceRequests
    : serviceRequests.filter(s => s.status === statusFilter);

  const stats = {
    total: serviceRequests.length,
    concluidos: serviceRequests.filter(s => s.status === 'concluido').length,
    ativos: serviceRequests.filter(s => ['aguardando', 'aceito', 'a_caminho', 'em_andamento', 'agendado'].includes(s.status)).length,
    gasto: serviceRequests.filter(s => s.status === 'concluido').reduce((sum, s) => sum + (s.final_price || 0), 0),
  };

  if (userLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/perfil')} className="p-2 hover:bg-accent rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Ficha do Cliente</h1>
          <p className="text-xs text-muted-foreground">{user?.full_name}</p>
        </div>
      </div>

      {/* Perfil resumido */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-3xl p-5 border border-primary/20 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center text-2xl font-black text-primary">
            {user?.full_name?.charAt(0) || '?'}
          </div>
          <div className="flex-1">
            <p className="font-black text-xl text-foreground">{user?.full_name}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            {clientProfile?.phone && (
              <div className="flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{clientProfile.phone}</p>
              </div>
            )}
            {clientProfile?.referral_code && (
              <p className="text-xs text-primary font-semibold mt-1">🎁 Código: {clientProfile.referral_code}</p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-card rounded-xl p-2.5 text-center">
            <p className="text-xl font-black text-foreground">{stats.total}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">Pedidos</p>
          </div>
          <div className="bg-card rounded-xl p-2.5 text-center">
            <p className="text-xl font-black text-green-600">{stats.concluidos}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">Concluídos</p>
          </div>
          <div className="bg-card rounded-xl p-2.5 text-center">
            <p className="text-xl font-black text-orange-600">{stats.ativos}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">Ativos</p>
          </div>
          <div className="bg-card rounded-xl p-2.5 text-center">
            <p className="text-sm font-black text-primary">R${stats.gasto.toFixed(0)}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">Total gasto</p>
          </div>
        </div>
      </div>

      {/* Filtros de status */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-none">
        {['todos', 'concluido', 'em_andamento', 'aguardando', 'agendado', 'cancelado'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={cn("flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all",
              statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:border-primary/40")}>
            {s === 'todos' ? `Todos (${serviceRequests.length})` : `${STATUS_CONFIG[s]?.label} (${serviceRequests.filter(r => r.status === s).length})`}
          </button>
        ))}
      </div>

      {/* Lista de serviços */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-muted/50 rounded-2xl p-10 text-center border border-dashed border-border">
          <Wrench className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="font-semibold text-foreground">Nenhum serviço encontrado</p>
          <p className="text-xs text-muted-foreground mt-1">
            {statusFilter !== 'todos' ? 'Tente outro filtro de status' : 'Nenhum serviço solicitado ainda'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(service => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      )}
    </div>
  );
}