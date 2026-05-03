import React from 'react';
import { Wallet, TrendingUp, Clock, ArrowDownCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function WalletCard({ wallet, ownerType }) {
  const isProvider = ownerType === 'prestador';
  const gradient = isProvider
    ? 'from-blue-600 to-indigo-700'
    : 'from-emerald-500 to-teal-600';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br ${gradient} text-white rounded-3xl p-6 shadow-xl`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold opacity-80 uppercase tracking-wider">
              {isProvider ? 'Carteira do Prestador' : 'Minha Carteira'}
            </p>
            <p className="text-xs opacity-60">Reparo Expresso</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs opacity-70">Saldo disponível</p>
          <p className="text-3xl font-black">R$ {(wallet?.balance || 0).toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-6">
        <div className="bg-white/15 rounded-2xl p-3 text-center">
          <TrendingUp className="w-4 h-4 mx-auto mb-1 opacity-80" />
          <p className="text-sm font-bold">R$ {(wallet?.total_earned || 0).toFixed(2)}</p>
          <p className="text-xs opacity-70">Total ganho</p>
        </div>
        <div className="bg-white/15 rounded-2xl p-3 text-center">
          <Clock className="w-4 h-4 mx-auto mb-1 opacity-80" />
          <p className="text-sm font-bold">R$ {(wallet?.pending_balance || 0).toFixed(2)}</p>
          <p className="text-xs opacity-70">Pendente</p>
        </div>
        <div className="bg-white/15 rounded-2xl p-3 text-center">
          <ArrowDownCircle className="w-4 h-4 mx-auto mb-1 opacity-80" />
          <p className="text-sm font-bold">R$ {(wallet?.total_withdrawn || 0).toFixed(2)}</p>
          <p className="text-xs opacity-70">Sacado</p>
        </div>
      </div>
    </motion.div>
  );
}