import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertCircle, CheckCircle2, XCircle, Calendar, FileText, Camera,
  ChevronRight, Clock, AlertTriangle, Eye, EyeOff, Download
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const DocumentReviewModal = ({ provider, onClose, onApprove, onReject }) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);

  const hasValidCNH = provider.cnh_expiry && new Date(provider.cnh_expiry) > new Date();
  const hasValidCRLV = provider.crlv_expiry && new Date(provider.crlv_expiry) > new Date();
  const hasPhotos = provider.photo_url && provider.photo_body_url;

  const canApprove = hasValidCNH && hasValidCRLV && hasPhotos;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-border p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-muted flex-shrink-0">
              {provider.photo_url && (
                <img src={provider.photo_url} alt={provider.name} className="w-full h-full object-cover" />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">{provider.name}</h2>
              <p className="text-muted-foreground">{provider.cpf}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-2xl text-muted-foreground hover:text-foreground">×</button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Documentos */}
          <div className="space-y-3">
            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5" /> Documentos
            </h3>
            
            {/* CNH */}
            <div className={cn(
              "rounded-2xl p-4 border-2",
              hasValidCNH ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
            )}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {hasValidCNH ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    <p className="font-bold text-foreground">CNH - Carteira de Habilitação</p>
                  </div>
                  {provider.cnh_expiry && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4" />
                      <span className={hasValidCNH ? "text-green-700" : "text-red-700"}>
                        {hasValidCNH ? "Válida até" : "Expirou em"}: {new Date(provider.cnh_expiry).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  )}
                </div>
                {provider.cnh_url && (
                  <a href={provider.cnh_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/50 text-primary hover:bg-white transition-colors">
                    <Download className="w-4 h-4" /> Ver
                  </a>
                )}
              </div>
            </div>

            {/* CRLV */}
            <div className={cn(
              "rounded-2xl p-4 border-2",
              hasValidCRLV ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
            )}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {hasValidCRLV ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    <p className="font-bold text-foreground">CRLV - Registro do Veículo</p>
                  </div>
                  {provider.crlv_expiry && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4" />
                      <span className={hasValidCRLV ? "text-green-700" : "text-red-700"}>
                        {hasValidCRLV ? "Válido até" : "Expirou em"}: {new Date(provider.crlv_expiry).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  )}
                </div>
                {provider.crlv_url && (
                  <a href={provider.crlv_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/50 text-primary hover:bg-white transition-colors">
                    <Download className="w-4 h-4" /> Ver
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Fotos */}
          <div className="space-y-3">
            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
              <Camera className="w-5 h-5" /> Fotos do Prestador
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Foto rosto */}
              <div className={cn(
                "rounded-2xl overflow-hidden border-2 cursor-pointer transition-all hover:shadow-lg",
                provider.photo_url ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50"
              )} onClick={() => setSelectedImage(provider.photo_url)}>
                <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                  {provider.photo_url ? (
                    <img src={provider.photo_url} alt="Foto rosto" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div className="p-3">
                  <p className="font-semibold text-sm text-foreground">Foto do Rosto</p>
                  <p className="text-xs text-muted-foreground">{provider.photo_url ? "✓ Enviada" : "Não enviada"}</p>
                </div>
              </div>

              {/* Foto corpo inteiro */}
              <div className={cn(
                "rounded-2xl overflow-hidden border-2 cursor-pointer transition-all hover:shadow-lg",
                provider.photo_body_url ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50"
              )} onClick={() => setSelectedImage(provider.photo_body_url)}>
                <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                  {provider.photo_body_url ? (
                    <img src={provider.photo_body_url} alt="Foto corpo" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div className="p-3">
                  <p className="font-semibold text-sm text-foreground">Foto Corpo Inteiro</p>
                  <p className="text-xs text-muted-foreground">{provider.photo_body_url ? "✓ Enviada" : "Não enviada"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Informações adicionais */}
          <div className="space-y-3">
            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Informações
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-muted-foreground font-medium">Email</p>
                <p className="text-foreground">{provider.email || '—'}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-muted-foreground font-medium">Telefone</p>
                <p className="text-foreground">{provider.phone || '—'}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-muted-foreground font-medium">Especialidades</p>
                <p className="text-foreground">{(provider.specialties || []).join(', ') || '—'}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-muted-foreground font-medium">Experiência</p>
                <p className="text-foreground">{provider.experience_years || 0} anos</p>
              </div>
            </div>
          </div>

          {/* Rejeição */}
          {!canApprove && (
            <div className="space-y-3">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" /> Motivo da Rejeição (obrigatório)
              </h3>
              <Textarea
                placeholder="Explique por que está rejeitando este prestador..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          )}

          {/* Alertas */}
          {!hasValidCNH && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            ⚠️ CNH inválida ou expirada
          </div>}
          {!hasValidCRLV && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            ⚠️ CRLV inválido ou expirado
          </div>}
          {!hasPhotos && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            ⚠️ Fotos não foram enviadas
          </div>}
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-white border-t border-border p-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-lg border border-border hover:bg-muted transition-colors font-semibold">
            Voltar
          </button>
          {canApprove ? (
            <button onClick={() => onApprove(provider.id)} className="flex-1 py-3 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors font-semibold flex items-center justify-center gap-2">
              <CheckCircle2 className="w-5 h-5" /> Aprovar Acesso
            </button>
          ) : (
            <button
              onClick={() => onReject(provider.id, rejectionReason)}
              disabled={!rejectionReason}
              className={cn(
                "flex-1 py-3 rounded-lg text-white transition-colors font-semibold flex items-center justify-center gap-2",
                rejectionReason
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-red-300 cursor-not-allowed"
              )}
            >
              <XCircle className="w-5 h-5" /> Rejeitar
            </button>
          )}
        </div>
      </div>

      {/* Image Viewer */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <div className="max-w-2xl w-full">
            <img src={selectedImage} alt="Visualização" className="w-full rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
};

export default function ProviderDocumentReview() {
  const [selectedProvider, setSelectedProvider] = useState(null);
  const queryClient = useQueryClient();

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['providers-review'],
    queryFn: async () => {
      const all = await base44.entities.Provider.filter({});
      return all.filter(p => !p.is_approved && !p.is_rejected);
    },
  });

  const approveProvider = useMutation({
    mutationFn: (providerId) =>
      base44.entities.Provider.update(providerId, { is_approved: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers-review'] });
      setSelectedProvider(null);
      toast.success('Prestador aprovado!');
    },
  });

  const rejectProvider = useMutation({
    mutationFn: ({ providerId, reason }) =>
      base44.entities.Provider.update(providerId, {
        is_rejected: true,
        rejection_reason: reason,
        rejected_at: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers-review'] });
      setSelectedProvider(null);
      toast.success('Prestador rejeitado');
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">Revisão de Prestadores</h2>
        <p className="text-muted-foreground">Analise documentos e fotos para liberar acesso</p>
      </div>

      {providers.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-2xl">
          <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
          <p className="text-lg font-semibold text-foreground mb-1">Nenhum prestador aguardando revisão</p>
          <p className="text-muted-foreground">Todos os cadastros foram analisados</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {providers.map((provider) => {
            const daysUntilCNHExpiry = provider.cnh_expiry
              ? Math.ceil((new Date(provider.cnh_expiry) - new Date()) / (1000 * 60 * 60 * 24))
              : -1;
            const daysUntilCRLVExpiry = provider.crlv_expiry
              ? Math.ceil((new Date(provider.crlv_expiry) - new Date()) / (1000 * 60 * 60 * 24))
              : -1;

            const statusCNH = daysUntilCNHExpiry > 0 ? "valid" : "invalid";
            const statusCRLV = daysUntilCRLVExpiry > 0 ? "valid" : "invalid";
            const photoStatus = provider.photo_url && provider.photo_body_url ? "complete" : "incomplete";

            return (
              <button
                key={provider.id}
                onClick={() => setSelectedProvider(provider)}
                className="text-left p-4 rounded-2xl border border-border hover:border-primary/50 hover:shadow-lg transition-all bg-card"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4 flex-1 min-w-0">
                    <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 bg-muted">
                      {provider.photo_url && (
                        <img src={provider.photo_url} alt={provider.name} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground text-lg">{provider.name}</p>
                      <p className="text-sm text-muted-foreground mb-3">{provider.cpf}</p>

                      <div className="flex flex-wrap gap-2">
                        {/* CNH Status */}
                        <div className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium",
                          statusCNH === 'valid'
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        )}>
                          {statusCNH === 'valid' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                          CNH {daysUntilCNHExpiry > 0 ? `(${daysUntilCNHExpiry}d)` : '(expirada)'}
                        </div>

                        {/* CRLV Status */}
                        <div className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium",
                          statusCRLV === 'valid'
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        )}>
                          {statusCRLV === 'valid' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                          CRLV {daysUntilCRLVExpiry > 0 ? `(${daysUntilCRLVExpiry}d)` : '(expirado)'}
                        </div>

                        {/* Photos Status */}
                        <div className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium",
                          photoStatus === 'complete'
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        )}>
                          {photoStatus === 'complete' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                          Fotos {photoStatus === 'complete' ? '✓' : '✗'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedProvider && (
        <DocumentReviewModal
          provider={selectedProvider}
          onClose={() => setSelectedProvider(null)}
          onApprove={(id) => approveProvider.mutate(id)}
          onReject={(id, reason) => rejectProvider.mutate({ providerId: id, reason })}
        />
      )}
    </div>
  );
}