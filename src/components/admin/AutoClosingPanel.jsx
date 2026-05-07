import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2, AlertTriangle, XCircle, Play, ChevronDown, ChevronUp,
  BarChart3, FileCheck, RefreshCw, Hash, User, DollarSign, Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const SERVICE_LABELS = {
  eletrica: "Elétrica", hidraulica: "Hidráulica", pintura: "Pintura",
  reparo_geral: "Reparo Geral", montagem: "Montagem", alvenaria: "Alvenaria",
  fechadura: "Fechadura", ar_condicionado: "Ar Condicionado",
  limpeza_caixa_dagua: "Caixa d'Água", desentupimento: "Desentupimento",
  reboque: "Reboque", troca_pneu: "Troca de Pneu", recarga_bateria: "Recarga de Bateria",
  conserto_pneu: "Conserto de Pneu", outros: "Outros",
};

function fmt(n) {
  return Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ClosingCard({ closing }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-green-200 bg-green-50 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between gap-3 p-3 hover:bg-green-100/60 transition text-left"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-8 h-8 bg-green-200 rounded-lg flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-green-800" />
          </div>
          <div>
            <p className="font-bold text-green-900 text-sm">{closing.provider_name}</p>
            <p className="text-xs text-green-700">{closing.total_services} serviço(s) · Bruto R$ {fmt(closing.gross_amount)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right">
            <p className="font-extrabold text-green-800 text-sm">R$ {fmt(closing.net_amount)}</p>
            <p className="text-[10px] text-green-600">líquido</p>
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-green-600" /> : <ChevronDown className="w-4 h-4 text-green-600" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-green-200 p-3 space-y-2 bg-white/60">
          <div className="grid grid-cols-3 gap-2 text-xs text-center">
            <div className="bg-green-100 rounded-lg p-2">
              <p className="font-bold text-green-800">R$ {fmt(closing.gross_amount)}</p>
              <p className="text-green-600">Bruto</p>
            </div>
            <div className="bg-orange-100 rounded-lg p-2">
              <p className="font-bold text-orange-800">- R$ {fmt(closing.gross_amount - closing.net_amount)}</p>
              <p className="text-orange-600">Fundo (3%)</p>
            </div>
            <div className="bg-primary/10 rounded-lg p-2">
              <p className="font-bold text-primary">R$ {fmt(closing.net_amount)}</p>
              <p className="text-primary/70">Líquido</p>
            </div>
          </div>

          <p className="text-xs font-semibold text-foreground mt-2">Serviços incluídos:</p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {closing.services?.map((s, i) => (
              <div key={i} className="flex items-center justify-between gap-2 bg-white rounded-lg px-2 py-1.5 border border-green-100 text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  {s.service_number && (
                    <span className="font-mono text-primary/70 bg-primary/10 px-1 rounded text-[10px] flex-shrink-0">
                      {s.service_number}
                    </span>
                  )}
                  <span className="font-semibold text-foreground truncate">{SERVICE_LABELS[s.service_type] || s.service_type}</span>
                  <span className="text-muted-foreground truncate">· {s.client_name}</span>
                </div>
                <span className="font-bold text-primary flex-shrink-0">R$ {fmt(s.final_price)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function IssueCard({ issue }) {
  return (
    <div className="border border-red-200 bg-red-50 rounded-xl p-3 flex items-start gap-3">
      <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-1">
          {issue.service_number && (
            <span className="font-mono text-[10px] bg-red-200 text-red-800 px-1.5 py-0.5 rounded">
              {issue.service_number}
            </span>
          )}
          <span className="text-xs font-bold text-red-900">{issue.client || '—'}</span>
          {issue.provider && <span className="text-xs text-red-700">· {issue.provider}</span>}
        </div>
        <div className="flex flex-wrap gap-1">
          {issue.errors.map((err, i) => (
            <span key={i} className="text-[10px] bg-red-200 text-red-800 px-1.5 py-0.5 rounded-full">{err}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AutoClosingPanel() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd]     = useState('');
  const [showIssues, setShowIssues]   = useState(true);
  const [showCreated, setShowCreated] = useState(true);
  const [selectedProviderId, setSelectedProviderId] = useState('');

  const { data: providers = [] } = useQuery({
    queryKey: ['providers-approved'],
    queryFn: () => base44.entities.Provider.filter({ is_approved: true }, 'name', 200),
  });

  const run = async () => {
    setLoading(true);
    setResult(null);
    try {
      const payload = {};
      if (periodStart && periodEnd) {
        payload.period_start = periodStart;
        payload.period_end   = periodEnd;
      }
      if (selectedProviderId) {
        payload.provider_id = selectedProviderId;
      }
      const res = await base44.functions.invoke('autoClosingReview', payload);
      setResult(res.data);
      queryClient.invalidateQueries({ queryKey: ['all-closings'] });
      if (res.data.summary?.closings_created > 0) {
        toast.success(`${res.data.summary.closings_created} fechamento(s) criado(s) com sucesso!`);
      } else {
        toast.info('Nenhum fechamento novo gerado — verifique o período ou inconsistências.');
      }
    } catch (err) {
      toast.error('Erro ao executar fechamento: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">Fechamento Automático com Conferência</h3>
            <p className="text-xs text-muted-foreground">O sistema confere os valores, identifica inconsistências e gera os fechamentos aprovados</p>
          </div>
        </div>

        {/* Seletor de prestador */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Prestador (opcional — deixe em branco para todos)</label>
          <select
            value={selectedProviderId}
            onChange={e => setSelectedProviderId(e.target.value)}
            className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-background"
          >
            <option value="">— Todos os prestadores —</option>
            {providers.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Período personalizado (opcional) */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Início (opcional)</label>
            <input
              type="date"
              value={periodStart}
              onChange={e => setPeriodStart(e.target.value)}
              className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-background"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Fim (opcional)</label>
            <input
              type="date"
              value={periodEnd}
              onChange={e => setPeriodEnd(e.target.value)}
              className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-background"
            />
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">Se não informado, usa o período quinzenal anterior automaticamente.</p>

        <Button
          className="w-full rounded-xl gap-2 h-11 font-bold"
          onClick={run}
          disabled={loading}
        >
          {loading
            ? <><RefreshCw className="w-4 h-4 animate-spin" /> Conferindo serviços...</>
            : <><Play className="w-4 h-4" /> {selectedProviderId ? `Fechar: ${providers.find(p => p.id === selectedProviderId)?.name || '...'}` : 'Executar Fechamento Automático'}</>
          }
        </Button>
      </div>

      {/* Resultado */}
      {result && (
        <div className="space-y-4">
          {/* Período */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            <span>Período analisado: <strong className="text-foreground">{result.period}</strong></span>
          </div>

          {/* Cards de resumo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card border border-border rounded-xl p-3 text-center">
              <p className="text-2xl font-extrabold text-foreground">{result.summary.total_services}</p>
              <p className="text-xs text-muted-foreground">Serviços analisados</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
              <p className="text-2xl font-extrabold text-green-800">{result.summary.approved_services}</p>
              <p className="text-xs text-green-600">Aprovados</p>
            </div>
            <div className={cn("rounded-xl p-3 text-center border",
              result.summary.issues_count > 0
                ? "bg-red-50 border-red-200"
                : "bg-muted border-border"
            )}>
              <p className={cn("text-2xl font-extrabold",
                result.summary.issues_count > 0 ? "text-red-800" : "text-muted-foreground"
              )}>
                {result.summary.issues_count}
              </p>
              <p className={cn("text-xs", result.summary.issues_count > 0 ? "text-red-600" : "text-muted-foreground")}>
                Inconsistências
              </p>
            </div>
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-center">
              <p className="text-2xl font-extrabold text-primary">{result.summary.closings_created}</p>
              <p className="text-xs text-primary/70">Fechamentos criados</p>
            </div>
          </div>

          {/* Já existentes */}
          {result.closings_existing?.length > 0 && (
            <div className="bg-muted/40 border border-border rounded-xl p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                <FileCheck className="w-3.5 h-3.5" /> Fechamentos já existentes (não duplicados)
              </p>
              <div className="flex flex-wrap gap-2">
                {result.closings_existing.map((e, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{e.provider_name}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Fechamentos criados */}
          {result.closings_created?.length > 0 && (
            <div>
              <button
                className="w-full flex items-center justify-between mb-2"
                onClick={() => setShowCreated(v => !v)}
              >
                <p className="text-sm font-bold text-green-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  {result.closings_created.length} Fechamento(s) Gerado(s)
                </p>
                {showCreated ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>
              {showCreated && (
                <div className="space-y-2">
                  {result.closings_created.map((c, i) => (
                    <ClosingCard key={i} closing={c} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Inconsistências */}
          {result.issues?.length > 0 && (
            <div>
              <button
                className="w-full flex items-center justify-between mb-2"
                onClick={() => setShowIssues(v => !v)}
              >
                <p className="text-sm font-bold text-red-700 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  {result.issues.length} Inconsistência(s) — Ação necessária
                </p>
                {showIssues ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>
              {showIssues && (
                <div className="space-y-2">
                  {result.issues.map((issue, i) => (
                    <IssueCard key={i} issue={issue} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tudo certo */}
          {result.issues?.length === 0 && result.summary.total_services > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-green-800">Todos os serviços foram aprovados!</p>
                <p className="text-xs text-green-700">Nenhuma inconsistência encontrada no período.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}