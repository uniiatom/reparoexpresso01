import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { RefreshCw, CheckCircle2, Clock, FileText } from 'lucide-react';

const STATUS_CONFIG = {
  pendente_nota: { label: 'Aguard. Nota', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: '⏳' },
  nota_enviada: { label: 'Nota Enviada', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: '📤' },
  pago: { label: 'Pago', color: 'bg-green-100 text-green-700 border-green-200', icon: '✅' },
};

export default function BiweeklyClosingAdmin() {
  const queryClient = useQueryClient();
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [generating, setGenerating] = useState(false);

  const { data: closings = [], isLoading } = useQuery({
    queryKey: ['biweekly-closings'],
    queryFn: () => base44.entities.BiweeklyClosing.list('-created_date', 100),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.BiweeklyClosing.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['biweekly-closings'] });
      toast.success('Status atualizado!');
    },
  });

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const payload = {};
      if (customStart && customEnd) {
        payload.period_start = customStart;
        payload.period_end = customEnd;
      }
      const res = await base44.functions.invoke('generateBiweeklyClosings', payload);
      toast.success(res.data?.message || 'Fechamento gerado!');
      queryClient.invalidateQueries({ queryKey: ['biweekly-closings'] });
    } catch (err) {
      toast.error('Erro: ' + (err.response?.data?.error || err.message));
    } finally {
      setGenerating(false);
    }
  };

  const stats = {
    pendente: closings.filter(c => c.status === 'pendente_nota').length,
    nota_enviada: closings.filter(c => c.status === 'nota_enviada').length,
    pago: closings.filter(c => c.status === 'pago').length,
    total_pendente: closings.filter(c => c.status !== 'pago').reduce((s, c) => s + (c.net_amount || 0), 0),
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
          <p className="text-xs text-orange-600 font-semibold">Aguard. Nota</p>
          <p className="text-xl font-bold text-orange-900">{stats.pendente}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <p className="text-xs text-blue-600 font-semibold">Nota Enviada</p>
          <p className="text-xl font-bold text-blue-900">{stats.nota_enviada}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3">
          <p className="text-xs text-green-600 font-semibold">Pagos</p>
          <p className="text-xl font-bold text-green-900">{stats.pago}</p>
        </div>
        <div className="bg-primary/10 rounded-xl p-3">
          <p className="text-xs text-primary font-semibold">Total Pendente</p>
          <p className="text-lg font-bold text-primary">R$ {stats.total_pendente.toFixed(2)}</p>
        </div>
      </div>

      {/* Gerar fechamento */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Gerar Fechamento Quinzenal
        </h3>
        <p className="text-xs text-muted-foreground">
          Sem data: usa automaticamente a quinzena anterior. Com data: usa o período informado.
        </p>
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-32">
            <label className="text-xs font-semibold text-muted-foreground">Início (opcional)</label>
            <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="text-sm mt-1" />
          </div>
          <div className="flex-1 min-w-32">
            <label className="text-xs font-semibold text-muted-foreground">Fim (opcional)</label>
            <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="text-sm mt-1" />
          </div>
        </div>
        <Button
          className="w-full font-semibold"
          onClick={handleGenerate}
          disabled={generating}
        >
          <RefreshCw className={cn('w-4 h-4 mr-2', generating && 'animate-spin')} />
          {generating ? 'Gerando...' : 'Gerar Fechamentos'}
        </Button>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : closings.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">Nenhum fechamento gerado</div>
      ) : (
        <div className="space-y-2">
          {closings.map(closing => {
            const config = STATUS_CONFIG[closing.status] || STATUS_CONFIG.pendente_nota;
            return (
              <div key={closing.id} className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground">{closing.provider_name}</p>
                    <p className="text-xs text-muted-foreground">{closing.period_label}</p>
                    <p className="text-xs text-muted-foreground">{closing.total_services} serviço(s)</p>
                  </div>
                  <Badge className={cn('text-xs border shrink-0', config.color)}>
                    {config.icon} {config.label}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-muted rounded-lg p-2 text-center">
                    <p className="text-muted-foreground">Bruto</p>
                    <p className="font-bold text-foreground">R$ {closing.gross_amount?.toFixed(2)}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-2 text-center">
                    <p className="text-red-600">Fundo (-3%)</p>
                    <p className="font-bold text-red-700">- R$ {closing.reserve_fund_deduction?.toFixed(2)}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2 text-center">
                    <p className="text-green-600">Líquido</p>
                    <p className="font-bold text-green-700">R$ {closing.net_amount?.toFixed(2)}</p>
                  </div>
                </div>

                {/* Botões de status */}
                <div className="flex gap-2 flex-wrap">
                  {closing.status === 'pendente_nota' && (
                    <Button size="sm" variant="outline" className="rounded-xl text-xs" disabled>
                      <Clock className="w-3 h-3 mr-1" /> Aguardando nota do prestador
                    </Button>
                  )}
                  {closing.status === 'nota_enviada' && (
                    <Button
                      size="sm"
                      className="rounded-xl text-xs bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => updateStatusMutation.mutate({ id: closing.id, status: 'pago' })}
                      disabled={updateStatusMutation.isPending}
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Marcar como Pago
                    </Button>
                  )}
                  {closing.status === 'pago' && (
                    <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Pagamento realizado
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}