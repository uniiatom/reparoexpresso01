import React from 'react';
import { ArrowUpCircle, ArrowDownCircle, Gift, RefreshCcw, Star, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const TYPE_CONFIG = {
  credit:     { icon: ArrowUpCircle,   color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Crédito',    sign: '+' },
  debit:      { icon: ArrowDownCircle, color: 'text-red-500',     bg: 'bg-red-50',     label: 'Débito',     sign: '-' },
  withdrawal: { icon: ArrowDownCircle, color: 'text-orange-500',  bg: 'bg-orange-50',  label: 'Saque PIX',  sign: '-' },
  refund:     { icon: RefreshCcw,      color: 'text-blue-500',    bg: 'bg-blue-50',    label: 'Estorno',    sign: '+' },
  cashback:   { icon: Gift,            color: 'text-purple-600',  bg: 'bg-purple-50',  label: 'Cashback',   sign: '+' },
  bonus:      { icon: Star,            color: 'text-yellow-600',  bg: 'bg-yellow-50',  label: 'Bônus',      sign: '+' },
};

const STATUS_LABEL = {
  completed: { label: '', className: '' },
  pending:   { label: 'Pendente', className: 'bg-yellow-100 text-yellow-700' },
  failed:    { label: 'Falhou', className: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelado', className: 'bg-muted text-muted-foreground' },
};

export default function TransactionList({ transactions = [] }) {
  if (transactions.length === 0) {
    return (
      <div className="bg-muted/40 rounded-2xl p-8 text-center border border-dashed border-border">
        <Zap className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
        <p className="text-sm font-semibold text-foreground">Nenhuma transação ainda</p>
        <p className="text-xs text-muted-foreground mt-1">Suas movimentações aparecerão aqui</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {transactions.map((tx, i) => {
        const cfg = TYPE_CONFIG[tx.type] || TYPE_CONFIG.credit;
        const Icon = cfg.icon;
        const isCredit = ['credit', 'refund', 'cashback', 'bonus'].includes(tx.type);
        const status = STATUS_LABEL[tx.status] || STATUS_LABEL.completed;

        return (
          <motion.div
            key={tx.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="bg-card border border-border rounded-2xl p-3 flex items-center gap-3"
          >
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', cfg.bg)}>
              <Icon className={cn('w-5 h-5', cfg.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground truncate">{tx.description || cfg.label}</p>
                {status.label && (
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0', status.className)}>
                    {status.label}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(tx.created_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className={cn('text-base font-bold', isCredit ? 'text-emerald-600' : 'text-red-500')}>
                {cfg.sign} R$ {Math.abs(tx.amount).toFixed(2)}
              </p>
              {tx.balance_after != null && (
                <p className="text-xs text-muted-foreground">saldo: R$ {tx.balance_after.toFixed(2)}</p>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}