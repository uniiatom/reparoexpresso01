import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Wallet, Gift, Clock, CheckCircle2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const SERVICE_LABELS = {
  eletrica: "Elétrica", hidraulica: "Hidráulica", pintura: "Pintura",
  reparo_geral: "Reparo Geral", montagem: "Montagem", alvenaria: "Alvenaria",
  fechadura: "Fechadura", ar_condicionado: "Ar Condicionado",
  limpeza_caixa_dagua: "Caixa d'Água", desentupimento: "Desentupimento",
  troca_pneu: "Troca Pneu", reboque: "Reboque", outros: "Outros",
};

export default function CashbackPanel({ userId, ownerType = 'cliente' }) {
  const [showHistory, setShowHistory] = useState(false);

  const { data: cashbacks = [], isLoading } = useQuery({
    queryKey: ['cashbacks', userId, ownerType],
    queryFn: () => base44.entities.Cashback.filter({ owner_id: userId, owner_type: ownerType }, '-created_date', 50),
    enabled: !!userId,
  });

  const available = cashbacks.filter(c => c.status === 'disponivel');
  const used = cashbacks.filter(c => c.status === 'utilizado');
  const totalDisponivel = available.reduce((sum, c) => sum + (c.cashback_amount || 0), 0);
  const totalGanho = cashbacks.reduce((sum, c) => sum + (c.cashback_amount || 0), 0);

  if (isLoading) return (
    <div className="bg-card rounded-3xl p-6 border border-border animate-pulse">
      <div className="h-4 bg-muted rounded w-1/2 mb-3" />
      <div className="h-8 bg-muted rounded w-1/3" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Saldo principal */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-3xl p-5 shadow-lg"
      >
        <div className="flex items-center gap-2 mb-3">
          <Wallet className="w-5 h-5 opacity-80" />
          <p className="text-sm font-semibold opacity-90">
            {ownerType === 'cliente' ? 'Seu Cashback' : 'Bônus Disponível'}
          </p>
        </div>
        <p className="text-4xl font-bold mb-1">R$ {totalDisponivel.toFixed(2)}</p>
        <p className="text-emerald-100 text-xs">disponível para usar no próximo serviço</p>

        <div className="flex gap-3 mt-4">
          <div className="flex-1 bg-white/15 rounded-2xl p-3 text-center">
            <p className="text-xl font-bold">{available.length}</p>
            <p className="text-xs opacity-80">disponíveis</p>
          </div>
          <div className="flex-1 bg-white/15 rounded-2xl p-3 text-center">
            <p className="text-xl font-bold">R$ {totalGanho.toFixed(2)}</p>
            <p className="text-xs opacity-80">total ganho</p>
          </div>
          <div className="flex-1 bg-white/15 rounded-2xl p-3 text-center">
            <p className="text-xl font-bold">{used.length}</p>
            <p className="text-xs opacity-80">utilizados</p>
          </div>
        </div>
      </motion.div>

      {/* Como funciona */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <p className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <Gift className="w-4 h-4 text-emerald-600" />
          {ownerType === 'cliente' ? 'Como funciona?' : 'Como ganhar bônus?'}
        </p>
        {ownerType === 'cliente' ? (
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>✅ Ganhe <strong>5%</strong> de cashback em todo serviço concluído</p>
            <p>💳 Use o saldo como desconto no próximo pedido</p>
            <p>⏳ Cashback válido por <strong>90 dias</strong> após o serviço</p>
          </div>
        ) : (
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>🏆 Ganhe <strong>R$ 20</strong> a cada 5 serviços concluídos</p>
            <p>⭐ Ganhe <strong>R$ 10</strong> por avaliação ≥ 4,5 estrelas</p>
            <p>💸 Bônus convertidos em crédito para saque</p>
          </div>
        )}
      </div>

      {/* Lista de cashbacks disponíveis */}
      {available.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">Disponíveis</p>
          {available.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-emerald-900">{c.reason}</p>
                <p className="text-xs text-emerald-700 truncate">
                  {SERVICE_LABELS[c.service_type] || c.service_type}
                  {c.expires_at && ` · expira ${new Date(c.expires_at).toLocaleDateString('pt-BR')}`}
                </p>
              </div>
              <p className="text-lg font-bold text-emerald-600 flex-shrink-0">R$ {c.cashback_amount?.toFixed(2)}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Histórico */}
      {used.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            <Clock className="w-4 h-4" />
            Histórico de utilizados ({used.length})
            <ChevronRight className={cn("w-4 h-4 ml-auto transition-transform", showHistory && "rotate-90")} />
          </button>
          {showHistory && (
            <div className="mt-2 space-y-2">
              {used.map(c => (
                <div key={c.id} className="bg-muted/50 border border-border rounded-2xl p-3 flex items-center gap-3 opacity-70">
                  <CheckCircle2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{c.reason}</p>
                    <p className="text-xs text-muted-foreground">{c.used_at ? `Usado em ${new Date(c.used_at).toLocaleDateString('pt-BR')}` : 'Utilizado'}</p>
                  </div>
                  <p className="text-sm font-semibold text-muted-foreground flex-shrink-0">R$ {c.cashback_amount?.toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {cashbacks.length === 0 && (
        <div className="bg-card border border-dashed border-border rounded-2xl p-8 text-center">
          <Wallet className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
          <p className="text-sm font-semibold text-foreground">Nenhum cashback ainda</p>
          <p className="text-xs text-muted-foreground mt-1">
            {ownerType === 'cliente'
              ? 'Complete seu primeiro serviço e ganhe 5% de volta!'
              : 'Conclua serviços e receba avaliações altas para ganhar bônus!'}
          </p>
        </div>
      )}
    </div>
  );
}