import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2, XCircle, Clock, FileText, Camera,
  Eye, X, ShieldCheck, User, MapPin, Mail, Phone, Calendar, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  PROVIDER_DOCUMENT_FIELD_MAP,
  CRLV_VEHICLE_TYPES,
  providerCanBeReleased,
  getProviderDocumentListStatus,
  countPendingDocuments,
} from '@/lib/providerRegistrationFields';
import { parseServiceOfferings } from '@/lib/providerRegistration';
import { LOGO_SHIELD_SRC } from '@/lib/brandAssets';

const STATUS_CONFIG = {
  aprovado:    { label: 'Aprovado',    color: 'bg-green-500/15 text-green-400 border-green-500/30',  icon: CheckCircle2 },
  reprovado:   { label: 'Reprovado',   color: 'bg-red-500/15 text-red-400 border-red-500/30',      icon: XCircle },
  pendente:    { label: 'Pendente',    color: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: Clock },
  nao_enviado: { label: 'Não enviado', color: 'bg-muted text-muted-foreground border-border',       icon: Clock },
  liberado:    { label: 'Liberado',    color: 'bg-primary/15 text-primary border-primary/30',       icon: ShieldCheck },
};

const FILTER_TABS = [
  { key: 'todos',     label: 'Todos',      color: 'bg-muted text-foreground' },
  { key: 'pendente',  label: 'Pendentes',  color: 'bg-amber-500/15 text-amber-400' },
  { key: 'reprovado', label: 'Reprovados', color: 'bg-red-500/15 text-red-400' },
  { key: 'liberado',  label: 'Liberados',  color: 'bg-primary/15 text-primary' },
];

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.nao_enviado;
  const Icon = cfg.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border', cfg.color)}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

function RegistrationSummary({ provider }) {
  const services = parseServiceOfferings(provider)
    .map((o) => o.label || o.service_type || o.serviceType)
    .filter(Boolean);

  const vehicleLabel = CRLV_VEHICLE_TYPES.find((v) => v.value === provider.crlv_vehicle_type)?.label;
  const addressParts = [
    provider.address,
    provider.neighborhood,
    provider.city && provider.state ? `${provider.city} - ${provider.state}` : provider.city,
    provider.zip_code,
  ].filter(Boolean);

  return (
    <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-3">
      <h3 className="font-bold text-foreground flex items-center gap-2">
        <User className="w-4 h-4" /> Dados do cadastro
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <InfoRow icon={Mail} label="E-mail" value={provider.email} />
        <InfoRow icon={Phone} label="Telefone" value={provider.phone} />
        <InfoRow icon={User} label="CPF" value={provider.cpf} />
        <InfoRow icon={User} label="RG" value={provider.rg} />
        <InfoRow icon={Calendar} label="Nascimento" value={provider.birth_date} />
        <InfoRow icon={MapPin} label="Endereço" value={addressParts.join(' · ')} />
      </div>
      {vehicleLabel && (
        <p className="text-sm"><span className="text-muted-foreground">Veículo (CRLV):</span> <strong>{vehicleLabel}</strong></p>
      )}
      {services.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Serviços</p>
          <div className="flex flex-wrap gap-1.5">
            {services.map((s) => (
              <span key={s} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{s}</span>
            ))}
          </div>
        </div>
      )}
      {provider.bio && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Observações</p>
          <p className="text-sm text-foreground whitespace-pre-wrap">{provider.bio}</p>
        </div>
      )}
    </div>
  );
}

function DocumentCard({ title, url, status, rejectionReason, onApprove, onReject, onClearReject }) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [reason, setReason] = useState('');
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.nao_enviado;

  const handleReject = () => {
    if (!reason.trim()) { toast.error('Informe o motivo da reprovação'); return; }
    onReject(reason);
    setShowRejectForm(false);
    setReason('');
  };

  return (
    <div className={cn('rounded-2xl border p-4 space-y-3 bg-card', cfg.color.split(' ').slice(2).join(' ') || 'border-border')}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="font-semibold text-sm text-foreground">{title}</span>
        </div>
        <StatusBadge status={status} />
      </div>

      {rejectionReason && status === 'reprovado' && (
        <div className="bg-red-500/10 border border-red-500/25 rounded-xl p-2 text-xs text-red-300">
          Motivo: {rejectionReason}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-sm font-medium transition-colors">
            <Eye className="w-3.5 h-3.5" /> Visualizar
          </a>
        ) : (
          <span className="text-xs text-muted-foreground italic">Documento não enviado</span>
        )}

        {url && status !== 'aprovado' && (
          <button type="button" onClick={onApprove} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-green-600 text-white hover:bg-green-700 text-sm font-medium transition-colors">
            <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar
          </button>
        )}

        {url && status !== 'reprovado' && (
          <button type="button" onClick={() => setShowRejectForm(!showRejectForm)} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/25 hover:bg-red-500/15 text-sm font-medium transition-colors">
            <XCircle className="w-3.5 h-3.5" /> Reprovar
          </button>
        )}

        {status === 'reprovado' && (
          <button type="button" onClick={onClearReject} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/25 text-sm font-medium transition-colors">
            <Clock className="w-3.5 h-3.5" /> Voltar para pendente
          </button>
        )}
      </div>

      {showRejectForm && (
        <div className="space-y-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Informe o motivo da reprovação..."
            rows={2}
            className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowRejectForm(false)} className="px-3 py-1.5 rounded-xl border border-border text-sm hover:bg-muted transition-colors">Cancelar</button>
            <button type="button" onClick={handleReject} className="px-3 py-1.5 rounded-xl bg-red-600 text-white text-sm hover:bg-red-700 transition-colors">Confirmar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function buildDocumentReviewList(provider) {
  const docs = Object.entries(PROVIDER_DOCUMENT_FIELD_MAP).map(([key, def]) => ({
    key,
    title: def.label,
    shortLabel: def.label.split('–')[0].trim(),
    url: provider[def.urlKey],
    status: provider[def.urlKey] ? (provider[def.statusKey] || def.defaultStatus) : 'nao_enviado',
    rejectionReason: provider[def.rejectionKey],
    statusField: def.statusKey,
    rejectionField: def.rejectionKey,
  }));

  if (provider.cnpj_url) {
    docs.push({
      key: 'cnpj',
      title: 'CNPJ – Comprovante de PJ',
      shortLabel: 'CNPJ',
      url: provider.cnpj_url,
      status: provider.cnpj_status || 'pendente',
      rejectionReason: provider.cnpj_rejection_reason,
      statusField: 'cnpj_status',
      rejectionField: 'cnpj_rejection_reason',
    });
  }

  return docs;
}

function ProviderReviewCard({ provider, requiredFields, onClick, index }) {
  const listStatus = getProviderDocumentListStatus(provider, requiredFields);
  const pendingCount = countPendingDocuments(provider, requiredFields);
  const docItems = buildDocumentReviewList(provider);
  const approvedCount = docItems.filter((d) => d.status === 'aprovado').length;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.28 }}
      onClick={onClick}
      className={cn(
        'group relative text-left rounded-2xl border bg-card/80 overflow-hidden',
        'hover:border-primary/35 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300',
        listStatus === 'liberado' ? 'border-primary/20' : 'border-border/70',
      )}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/60 via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted border border-border/60">
              {provider.photo_url
                ? <img src={provider.photo_url} alt={provider.name} className="w-full h-full object-cover" />
                : <img src={LOGO_SHIELD_SRC} alt="" className="w-full h-full object-contain p-2 opacity-80" />
              }
            </div>
            {pendingCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500 text-zinc-950 text-[9px] font-bold shadow-md shadow-amber-500/30">
                <AlertTriangle className="w-2.5 h-2.5" />
                {pendingCount}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground truncate leading-tight">{provider.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{provider.city || 'Cidade não informada'}</p>
            <p className="text-[11px] text-muted-foreground/80 truncate">{provider.phone}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {listStatus === 'liberado' ? (
            <StatusBadge status="liberado" />
          ) : listStatus === 'reprovado' ? (
            <StatusBadge status="reprovado" />
          ) : (
            <StatusBadge status="pendente" />
          )}

          {pendingCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-amber-500/12 text-amber-300 border-amber-500/30">
              <FileText className="w-2.5 h-2.5" />
              {pendingCount} doc. pendente{pendingCount > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {docItems.slice(0, 4).map((doc) => {
            const dcfg = STATUS_CONFIG[doc.status] || STATUS_CONFIG.nao_enviado;
            const DIcon = dcfg.icon;
            return (
              <span key={doc.key} className={cn('inline-flex items-center gap-1 px-1.5 py-1 rounded-lg text-[10px] font-medium border truncate', dcfg.color)}>
                <DIcon className="w-2.5 h-2.5 shrink-0" />
                <span className="truncate">{doc.shortLabel}</span>
              </span>
            );
          })}
        </div>

        {docItems.length > 4 && (
          <p className="text-[10px] text-muted-foreground">+{docItems.length - 4} documento(s)</p>
        )}

        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          <span className="text-[10px] text-muted-foreground">{approvedCount}/{docItems.length} aprovados</span>
          <span className="text-[10px] text-primary font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Revisar →</span>
        </div>
      </div>
    </motion.button>
  );
}

function ProviderDocumentModal({ provider, requiredFields, onClose, onUpdate }) {
  const queryClient = useQueryClient();
  const [selectedImage, setSelectedImage] = useState(null);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Provider.update(provider.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers-doc-review'] });
      toast.success('Documento atualizado');
      onUpdate();
    },
  });

  const setDocStatus = (statusField, rejectionField) => (status, reason = null) => {
    const data = { [statusField]: status };
    if (reason) data[rejectionField] = reason;
    if (status !== 'reprovado') data[rejectionField] = '';
    updateMutation.mutate(data);
  };

  const docs = buildDocumentReviewList(provider);
  const canRelease = providerCanBeReleased(provider, requiredFields);
  const pendingCount = countPendingDocuments(provider, requiredFields);

  const approveProvider = useMutation({
    mutationFn: () => base44.entities.Provider.update(provider.id, { is_approved: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers-doc-review'] });
      toast.success('Prestador aprovado com acesso liberado!');
      onClose();
    },
  });

  const docSummary = {
    aprovados: docs.filter((d) => d.status === 'aprovado').length,
    pendentes: docs.filter((d) => d.status === 'pendente' || d.status === 'nao_enviado').length,
    reprovados: docs.filter((d) => d.status === 'reprovado').length,
  };

  const photos = [
    { label: 'Foto do Rosto', url: provider.photo_url },
    { label: 'Foto Corpo Inteiro', url: provider.photo_body_url },
    { label: 'Segurando Documento', url: provider.id_holding_document_url },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-border shadow-2xl">
        <div className="sticky top-0 bg-card/95 backdrop-blur border-b border-border p-5 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted flex-shrink-0 border border-border">
              {provider.photo_url
                ? <img src={provider.photo_url} alt={provider.name} className="w-full h-full object-cover" />
                : <User className="w-8 h-8 m-3 text-muted-foreground" />
              }
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{provider.name}</h2>
              <p className="text-sm text-muted-foreground">{provider.cpf || 'CPF não informado'} · {provider.phone}</p>
              <div className="flex gap-2 mt-1 flex-wrap">
                {provider.is_approved && <StatusBadge status="liberado" />}
                {pendingCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-amber-500/12 text-amber-300 border-amber-500/30">
                    <AlertTriangle className="w-3 h-3" /> {pendingCount} doc. pendente{pendingCount > 1 ? 's' : ''}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">{docSummary.aprovados} aprovados · {docSummary.pendentes} pendentes</span>
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-muted rounded-xl">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <RegistrationSummary provider={provider} />
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4" /> Documentos para revisão
          </h3>
          {docs.map((doc) => (
            <DocumentCard
              key={doc.key}
              title={doc.title}
              url={doc.url}
              status={doc.status}
              rejectionReason={doc.rejectionReason}
              onApprove={() => setDocStatus(doc.statusField, doc.rejectionField)('aprovado')}
              onReject={(r) => setDocStatus(doc.statusField, doc.rejectionField)('reprovado', r)}
              onClearReject={() => setDocStatus(doc.statusField, doc.rejectionField)('pendente')}
            />
          ))}
          <h3 className="font-bold text-foreground flex items-center gap-2 pt-2">
            <Camera className="w-4 h-4" /> Fotos enviadas
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map((photo) => (
              <div
                key={photo.label}
                onClick={() => photo.url && setSelectedImage(photo.url)}
                className={cn(
                  'rounded-2xl border-2 overflow-hidden cursor-pointer hover:shadow-lg transition-all',
                  photo.url ? 'border-green-500/30' : 'border-border',
                )}
              >
                <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                  {photo.url
                    ? <img src={photo.url} alt={photo.label} className="w-full h-full object-cover" />
                    : <Camera className="w-8 h-8 text-muted-foreground" />
                  }
                </div>
                <div className="p-2 text-center">
                  <p className="text-xs font-semibold text-foreground">{photo.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="sticky bottom-0 bg-card/95 backdrop-blur border-t border-border p-5 flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>Fechar</Button>
          {!provider.is_approved && (
            <Button
              className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 gap-2"
              disabled={!canRelease || approveProvider.isPending}
              onClick={() => approveProvider.mutate()}
            >
              <ShieldCheck className="w-4 h-4" />
              {canRelease ? 'Liberar acesso' : 'Documentos pendentes'}
            </Button>
          )}
          {provider.is_approved && (
            <div className="flex-1 flex items-center justify-center gap-2 bg-primary/10 border border-primary/25 rounded-xl text-primary text-sm font-semibold">
              <ShieldCheck className="w-4 h-4" /> Acesso liberado
            </div>
          )}
        </div>
      </div>

      {selectedImage && (
        <div className="fixed inset-0 bg-black/80 z-60 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} alt="Visualização" className="max-w-lg w-full rounded-xl" />
        </div>
      )}
    </div>
  );
}

export default function ProviderDocumentReview() {
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [filter, setFilter] = useState('todos');
  const queryClient = useQueryClient();

  const { data: config = {} } = useQuery({
    queryKey: ['provider-config'],
    queryFn: async () => {
      const list = await base44.entities.ProviderConfig.list();
      return list[0] || {};
    },
  });

  const requiredFields = config.required_fields ?? [];

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['providers-doc-review'],
    queryFn: () => base44.entities.Provider.filter({}),
  });

  useEffect(() => {
    if (!selectedProvider) return;
    const fresh = providers.find((p) => p.id === selectedProvider.id);
    if (fresh) setSelectedProvider(fresh);
  }, [providers, selectedProvider?.id]);

  const activeProviders = useMemo(
    () => providers.filter((p) => !p.is_blocked && !p.is_archived),
    [providers],
  );

  const getListStatus = (p) => getProviderDocumentListStatus(p, requiredFields);

  const filtered = activeProviders.filter((p) => filter === 'todos' || getListStatus(p) === filter);

  const counts = {
    todos:     activeProviders.length,
    pendente:  activeProviders.filter((p) => getListStatus(p) === 'pendente').length,
    reprovado: activeProviders.filter((p) => getListStatus(p) === 'reprovado').length,
    liberado:  activeProviders.filter((p) => getListStatus(p) === 'liberado').length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">Revisão de documentos</h2>
        <p className="text-sm text-muted-foreground">
          Analise cadastros e documentos. Prestadores liberados aparecem na aba Liberados, mesmo que ainda existam docs pendentes de revisão.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {FILTER_TABS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-sm font-semibold transition-all border-2',
              filter === f.key ? 'border-primary ' + f.color : 'border-transparent ' + f.color + ' opacity-60',
            )}
          >
            {f.label} ({counts[f.key]})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-2xl border border-border/50">
          <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-3 opacity-60" />
          <p className="font-semibold text-foreground">Nenhum prestador nesta categoria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((provider, index) => (
            <ProviderReviewCard
              key={provider.id}
              provider={provider}
              requiredFields={requiredFields}
              index={index}
              onClick={() => setSelectedProvider(provider)}
            />
          ))}
        </div>
      )}

      {selectedProvider && (
        <ProviderDocumentModal
          provider={selectedProvider}
          requiredFields={requiredFields}
          onClose={() => setSelectedProvider(null)}
          onUpdate={() => queryClient.invalidateQueries({ queryKey: ['providers-doc-review'] })}
        />
      )}
    </div>
  );
}
