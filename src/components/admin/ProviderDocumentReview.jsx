import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2, XCircle, Clock, FileText, Camera, ChevronRight,
  Download, AlertCircle, Eye, X, ShieldCheck, ShieldX, Building2, User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  aprovado:    { label: 'Aprovado',    color: 'bg-green-100 text-green-700',  icon: CheckCircle2, border: 'border-green-300' },
  reprovado:   { label: 'Reprovado',   color: 'bg-red-100 text-red-700',      icon: XCircle,      border: 'border-red-300' },
  pendente:    { label: 'Pendente',    color: 'bg-yellow-100 text-yellow-700', icon: Clock,        border: 'border-yellow-300' },
  nao_enviado: { label: 'Não enviado', color: 'bg-gray-100 text-gray-500',    icon: AlertCircle,  border: 'border-gray-200' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.nao_enviado;
  const Icon = cfg.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold', cfg.color)}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
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
    <div className={cn('rounded-2xl border-2 p-4 space-y-3', cfg.border, 'bg-card')}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="font-semibold text-sm text-foreground">{title}</span>
        </div>
        <StatusBadge status={status} />
      </div>

      {rejectionReason && status === 'reprovado' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-2 text-xs text-red-700">
          ⚠️ Motivo: {rejectionReason}
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
          <button
            onClick={onApprove}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-green-600 text-white hover:bg-green-700 text-sm font-medium transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar
          </button>
        )}

        {url && status !== 'reprovado' && (
          <button
            onClick={() => setShowRejectForm(!showRejectForm)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 text-sm font-medium transition-colors"
          >
            <XCircle className="w-3.5 h-3.5" /> Reprovar
          </button>
        )}

        {status === 'reprovado' && (
          <button
            onClick={onClearReject}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100 text-sm font-medium transition-colors"
          >
            <Clock className="w-3.5 h-3.5" /> Voltar para Pendente
          </button>
        )}
      </div>

      {showRejectForm && (
        <div className="space-y-2">
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Informe o motivo da reprovação..."
            rows={2}
            className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          <div className="flex gap-2">
            <button onClick={() => setShowRejectForm(false)} className="px-3 py-1.5 rounded-xl border border-border text-sm hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button onClick={handleReject} className="px-3 py-1.5 rounded-xl bg-red-600 text-white text-sm hover:bg-red-700 transition-colors">
              Confirmar Reprovação
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProviderDocumentModal({ provider, onClose, onUpdate }) {
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

  const setDocStatus = (field, statusField, rejectionField) => (status, reason = null) => {
    const data = { [statusField]: status };
    if (reason) data[rejectionField] = reason;
    if (status !== 'reprovado') data[rejectionField] = '';
    updateMutation.mutate(data);
  };

  const allDocsApproved = () => {
    const cnh = provider.cnh_status === 'aprovado';
    const crlv = provider.crlv_status === 'aprovado';
    const cnpj = provider.cnpj_status === 'aprovado' || provider.cnpj_status === 'nao_enviado';
    const bg = provider.background_check_status === 'aprovado' || provider.background_check_status === 'nao_enviado';
    return cnh && crlv && cnpj && bg;
  };

  const approveProvider = useMutation({
    mutationFn: () => base44.entities.Provider.update(provider.id, { is_approved: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers-doc-review'] });
      toast.success('Prestador aprovado com acesso liberado!');
      onClose();
    },
  });

  const docs = [
    {
      title: 'CNH – Carteira de Habilitação',
      url: provider.cnh_url,
      status: provider.cnh_status || 'pendente',
      rejectionReason: provider.cnh_rejection_reason,
      onApprove: () => setDocStatus('cnh', 'cnh_status', 'cnh_rejection_reason')('aprovado'),
      onReject: (r) => setDocStatus('cnh', 'cnh_status', 'cnh_rejection_reason')('reprovado', r),
      onClearReject: () => setDocStatus('cnh', 'cnh_status', 'cnh_rejection_reason')('pendente'),
    },
    {
      title: 'CRLV – Registro do Veículo',
      url: provider.crlv_url,
      status: provider.crlv_status || 'pendente',
      rejectionReason: provider.crlv_rejection_reason,
      onApprove: () => setDocStatus('crlv', 'crlv_status', 'crlv_rejection_reason')('aprovado'),
      onReject: (r) => setDocStatus('crlv', 'crlv_status', 'crlv_rejection_reason')('reprovado', r),
      onClearReject: () => setDocStatus('crlv', 'crlv_status', 'crlv_rejection_reason')('pendente'),
    },
    {
      title: 'CNPJ – Comprovante de PJ',
      url: provider.cnpj_url,
      status: provider.cnpj_status || 'nao_enviado',
      rejectionReason: provider.cnpj_rejection_reason,
      onApprove: () => setDocStatus('cnpj', 'cnpj_status', 'cnpj_rejection_reason')('aprovado'),
      onReject: (r) => setDocStatus('cnpj', 'cnpj_status', 'cnpj_rejection_reason')('reprovado', r),
      onClearReject: () => setDocStatus('cnpj', 'cnpj_status', 'cnpj_rejection_reason')('pendente'),
    },
    {
      title: 'Antecedentes Criminais',
      url: provider.background_check_url,
      status: provider.background_check_status || 'nao_enviado',
      rejectionReason: provider.background_check_rejection_reason,
      onApprove: () => setDocStatus('bg', 'background_check_status', 'background_check_rejection_reason')('aprovado'),
      onReject: (r) => setDocStatus('bg', 'background_check_status', 'background_check_rejection_reason')('reprovado', r),
      onClearReject: () => setDocStatus('bg', 'background_check_status', 'background_check_rejection_reason')('pendente'),
    },
  ];

  const docSummary = {
    aprovados: docs.filter(d => d.status === 'aprovado').length,
    pendentes: docs.filter(d => d.status === 'pendente').length,
    reprovados: docs.filter(d => d.status === 'reprovado').length,
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-border p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-muted flex-shrink-0">
              {provider.photo_url
                ? <img src={provider.photo_url} alt={provider.name} className="w-full h-full object-cover" />
                : <User className="w-8 h-8 m-3 text-muted-foreground" />
              }
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{provider.name}</h2>
              <p className="text-sm text-muted-foreground">{provider.cpf} · {provider.phone}</p>
              <div className="flex gap-2 mt-1">
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">✓ {docSummary.aprovados} aprovados</span>
                {docSummary.pendentes > 0 && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-semibold">⏳ {docSummary.pendentes} pendentes</span>}
                {docSummary.reprovados > 0 && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">✗ {docSummary.reprovados} reprovados</span>}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Docs */}
        <div className="p-5 space-y-4">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4" /> Documentos para Revisão
          </h3>

          {docs.map((doc) => (
            <DocumentCard key={doc.title} {...doc} />
          ))}

          {/* Fotos */}
          <h3 className="font-bold text-foreground flex items-center gap-2 pt-2">
            <Camera className="w-4 h-4" /> Fotos
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Foto do Rosto', url: provider.photo_url },
              { label: 'Foto Corpo Inteiro', url: provider.photo_body_url },
            ].map(photo => (
              <div
                key={photo.label}
                onClick={() => photo.url && setSelectedImage(photo.url)}
                className={cn(
                  'rounded-2xl border-2 overflow-hidden cursor-pointer hover:shadow-lg transition-all',
                  photo.url ? 'border-green-200' : 'border-gray-200'
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
                  <p className="text-xs text-muted-foreground">{photo.url ? '✓ Enviada' : 'Não enviada'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-border p-5 flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>Fechar</Button>
          {!provider.is_approved && (
            <Button
              className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 gap-2"
              disabled={!allDocsApproved() || approveProvider.isPending}
              onClick={() => approveProvider.mutate()}
            >
              <ShieldCheck className="w-4 h-4" />
              {allDocsApproved() ? 'Liberar Acesso' : 'Documentos Pendentes'}
            </Button>
          )}
          {provider.is_approved && (
            <div className="flex-1 flex items-center justify-center gap-2 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-semibold">
              <ShieldCheck className="w-4 h-4" /> Acesso Liberado
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

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['providers-doc-review'],
    queryFn: () => base44.entities.Provider.filter({}),
  });

  const getProviderDocStatus = (p) => {
    const statuses = [
      p.cnh_status || 'pendente',
      p.crlv_status || 'pendente',
    ];
    if (p.cnpj_url) statuses.push(p.cnpj_status || 'pendente');
    if (p.background_check_url) statuses.push(p.background_check_status || 'pendente');
    if (statuses.every(s => s === 'aprovado')) return 'aprovado';
    if (statuses.some(s => s === 'reprovado')) return 'reprovado';
    return 'pendente';
  };

  const filtered = providers
    .filter(p => !p.is_blocked && !p.is_archived)
    .filter(p => filter === 'todos' || getProviderDocStatus(p) === filter);

  const counts = {
    todos: providers.filter(p => !p.is_blocked && !p.is_archived).length,
    pendente: providers.filter(p => !p.is_blocked && !p.is_archived && getProviderDocStatus(p) === 'pendente').length,
    reprovado: providers.filter(p => !p.is_blocked && !p.is_archived && getProviderDocStatus(p) === 'reprovado').length,
    aprovado: providers.filter(p => !p.is_blocked && !p.is_archived && getProviderDocStatus(p) === 'aprovado').length,
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">Revisão de Documentos</h2>
        <p className="text-sm text-muted-foreground">Analise e aprove documentos dos prestadores: CNPJ, CNH, CRLV e antecedentes criminais.</p>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'todos', label: 'Todos', color: 'bg-muted text-foreground' },
          { key: 'pendente', label: 'Pendentes', color: 'bg-yellow-100 text-yellow-700' },
          { key: 'reprovado', label: 'Reprovados', color: 'bg-red-100 text-red-700' },
          { key: 'aprovado', label: 'Aprovados', color: 'bg-green-100 text-green-700' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-sm font-semibold transition-all border-2',
              filter === f.key ? 'border-primary ' + f.color : 'border-transparent ' + f.color + ' opacity-60'
            )}
          >
            {f.label} ({counts[f.key]})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-2xl">
          <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
          <p className="font-semibold text-foreground">Nenhum prestador nesta categoria</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(provider => {
            const docStatus = getProviderDocStatus(provider);
            const cfg = STATUS_CONFIG[docStatus];
            const Icon = cfg.icon;

            const docItems = [
              { label: 'CNH', status: provider.cnh_status || 'pendente', url: provider.cnh_url },
              { label: 'CRLV', status: provider.crlv_status || 'pendente', url: provider.crlv_url },
              { label: 'CNPJ', status: provider.cnpj_status || 'nao_enviado', url: provider.cnpj_url },
              { label: 'Antecedentes', status: provider.background_check_status || 'nao_enviado', url: provider.background_check_url },
            ];

            return (
              <button
                key={provider.id}
                onClick={() => setSelectedProvider(provider)}
                className="w-full text-left p-4 rounded-2xl border border-border hover:border-primary/40 hover:shadow-md transition-all bg-card"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-muted flex-shrink-0">
                    {provider.photo_url
                      ? <img src={provider.photo_url} alt={provider.name} className="w-full h-full object-cover" />
                      : <User className="w-6 h-6 m-3 text-muted-foreground" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-foreground truncate">{provider.name}</p>
                      {provider.is_approved && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full flex-shrink-0 font-semibold">✓ Acesso Liberado</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{provider.city} · {provider.phone}</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {docItems.map(doc => {
                        const dcfg = STATUS_CONFIG[doc.status] || STATUS_CONFIG.nao_enviado;
                        const DIcon = dcfg.icon;
                        return (
                          <span key={doc.label} className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-xs font-medium', dcfg.color)}>
                            <DIcon className="w-2.5 h-2.5" /> {doc.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedProvider && (
        <ProviderDocumentModal
          provider={selectedProvider}
          onClose={() => setSelectedProvider(null)}
          onUpdate={() => setSelectedProvider(prev => ({ ...prev }))}
        />
      )}
    </div>
  );
}