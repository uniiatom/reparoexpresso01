import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, CheckCircle, FileText, RefreshCw, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  pendente_nota: { label: 'Pendente NF', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  nota_enviada: { label: 'NF Enviada', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  pago: { label: 'Pago', color: 'bg-green-100 text-green-700 border-green-200' },
};

export default function BiweeklyClosingAdmin() {
  const queryClient = useQueryClient();
  const [uploadingId, setUploadingId] = useState(null);
  const [generatingClosings, setGeneratingClosings] = useState(false);

  const { data: closings = [], isLoading } = useQuery({
    queryKey: ['all-closings'],
    queryFn: () => base44.entities.BiweeklyClosing.list('-created_date', 100),
  });

  const markPaidMutation = useMutation({
    mutationFn: ({ id, payment_proof_url }) =>
      base44.entities.BiweeklyClosing.update(id, { status: 'pago', payment_proof_url: payment_proof_url || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-closings'] });
      toast.success('Fechamento marcado como pago!');
    },
    onError: () => toast.error('Erro ao marcar como pago'),
  });

  const uploadProofMutation = useMutation({
    mutationFn: async ({ id, file }) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return base44.entities.BiweeklyClosing.update(id, { payment_proof_url: file_url });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-closings'] });
      toast.success('Comprovante anexado!');
    },
    onError: () => toast.error('Erro ao fazer upload do comprovante'),
  });

  const handleMarkPaidWithProof = async (id, file) => {
    setUploadingId(id);
    try {
      let payment_proof_url = null;
      if (file) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        payment_proof_url = file_url;
      }
      await markPaidMutation.mutateAsync({ id, payment_proof_url });
    } finally {
      setUploadingId(null);
    }
  };

  const handleUploadProof = async (id, file) => {
    setUploadingId(id);
    try {
      await uploadProofMutation.mutateAsync({ id, file });
    } finally {
      setUploadingId(null);
    }
  };

  const handleGenerateClosings = async () => {
    setGeneratingClosings(true);
    try {
      await base44.functions.invoke('generateBiweeklyClosings', {});
      queryClient.invalidateQueries({ queryKey: ['all-closings'] });
      toast.success('Fechamentos gerados com sucesso!');
    } catch (err) {
      toast.error('Erro ao gerar fechamentos: ' + err.message);
    } finally {
      setGeneratingClosings(false);
    }
  };

  const stats = {
    pendente_nota: closings.filter(c => c.status === 'pendente_nota').length,
    nota_enviada: closings.filter(c => c.status === 'nota_enviada').length,
    pago: closings.filter(c => c.status === 'pago').length,
    total: closings.reduce((sum, c) => sum + (c.net_amount || 0), 0),
  };

  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-foreground">Fechamentos Quinzenais</h2>
          <p className="text-xs text-muted-foreground">{closings.length} registros · Total líquido R$ {stats.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleGenerateClosings}
          disabled={generatingClosings}
          className="rounded-xl gap-2"
        >
          <RefreshCw className={cn('w-4 h-4', generatingClosings && 'animate-spin')} />
          {generatingClosings ? 'Gerando...' : 'Gerar Fechamentos'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-orange-800">{stats.pendente_nota}</p>
          <p className="text-xs text-orange-600">Pendente NF</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-blue-800">{stats.nota_enviada}</p>
          <p className="text-xs text-blue-600">NF Enviada</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-green-800">{stats.pago}</p>
          <p className="text-xs text-green-600">Pagos</p>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : closings.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="font-semibold">Nenhum fechamento encontrado</p>
          <p className="text-xs mt-1">Clique em "Gerar Fechamentos" para criar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {closings.map(closing => {
            const config = STATUS_CONFIG[closing.status] || STATUS_CONFIG.pendente_nota;
            const isUploading = uploadingId === closing.id;

            return (
              <div key={closing.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-foreground text-sm">{closing.provider_name || 'Prestador'}</p>
                    <p className="text-xs text-muted-foreground">{closing.period_label}</p>
                    <p className="text-xs text-muted-foreground">{closing.total_services} serviço(s)</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">R$ {(closing.net_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <Badge className={cn('text-xs border mt-1', config.color)}>{config.label}</Badge>
                  </div>
                </div>

                {/* Comprovante existente */}
                {closing.payment_proof_url && (
                  <a
                    href={closing.payment_proof_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-primary font-semibold bg-primary/10 rounded-lg px-3 py-2 hover:bg-primary/20 transition w-fit"
                  >
                    <ExternalLink className="w-3 h-3" /> Ver comprovante
                  </a>
                )}

                {/* Ações */}
                {closing.status === 'nota_enviada' && (
                  <div className="flex gap-2 flex-wrap">
                    {/* Pagar + Comprovante */}
                    <label className="flex-1 cursor-pointer">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        disabled={isUploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleMarkPaidWithProof(closing.id, file);
                          e.target.value = '';
                        }}
                      />
                      <div className={cn(
                        'flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition border cursor-pointer',
                        'bg-green-600 hover:bg-green-700 text-white border-green-600',
                        isUploading && 'opacity-50 pointer-events-none'
                      )}>
                        <Upload className="w-3 h-3" />
                        {isUploading ? 'Enviando...' : 'Pagar + Comprovante'}
                      </div>
                    </label>

                    {/* Marcar pago sem comprovante */}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isUploading || markPaidMutation.isPending}
                      onClick={() => markPaidMutation.mutate({ id: closing.id, payment_proof_url: null })}
                      className="rounded-lg text-xs border-green-300 text-green-700 hover:bg-green-50"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" /> Marcar Pago
                    </Button>
                  </div>
                )}

                {/* Pago mas sem comprovante — permitir anexar */}
                {closing.status === 'pago' && !closing.payment_proof_url && (
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      disabled={isUploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadProof(closing.id, file);
                        e.target.value = '';
                      }}
                    />
                    <div className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition border cursor-pointer w-fit',
                      'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300',
                      isUploading && 'opacity-50 pointer-events-none'
                    )}>
                      <Upload className="w-3 h-3" />
                      {isUploading ? 'Enviando...' : 'Anexar comprovante'}
                    </div>
                  </label>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}