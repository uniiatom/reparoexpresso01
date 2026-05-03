import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, ArrowUpCircle, Filter, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import WalletCard from '@/components/wallet/WalletCard';
import TransactionList from '@/components/wallet/TransactionList';
import WithdrawModal from '@/components/wallet/WithdrawModal';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Wallet() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [ownerType, setOwnerType] = useState(null); // null = carregando
  const [isProvider, setIsProvider] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    base44.auth.me()
      .then(async u => {
        setUser(u);
        const providers = await base44.entities.Provider.filter({ user_id: u.id });
        const hasProvider = providers.length > 0;
        setIsProvider(hasProvider);
        setOwnerType(hasProvider ? 'prestador' : 'cliente');
      })
      .catch(() => navigate('/'));
  }, [navigate]);

  const { data: wallet, isLoading: walletLoading, refetch: refetchWallet } = useQuery({
    queryKey: ['wallet', user?.id, ownerType],
    queryFn: async () => {
      const list = await base44.entities.Wallet.filter({ owner_id: user.id, owner_type: ownerType });
      if (list.length > 0) return list[0];
      // Cria carteira automaticamente
      const newWallet = await base44.entities.Wallet.create({
        owner_id: user.id,
        owner_type: ownerType,
        owner_name: user.full_name,
        owner_email: user.email,
        balance: 0,
        pending_balance: 0,
        total_earned: 0,
        total_withdrawn: 0,
      });
      return newWallet;
    },
    enabled: !!user?.id && !!ownerType,
  });

  const { data: transactions = [], isLoading: txLoading, refetch: refetchTx } = useQuery({
    queryKey: ['wallet-transactions', wallet?.id],
    queryFn: () => base44.entities.WalletTransaction.filter(
      { wallet_id: wallet.id },
      '-created_date',
      50
    ),
    enabled: !!wallet?.id,
  });

  const filtered = filter === 'all'
    ? transactions
    : transactions.filter(tx => {
        if (filter === 'in') return ['credit', 'refund', 'cashback', 'bonus'].includes(tx.type);
        if (filter === 'out') return ['debit', 'withdrawal'].includes(tx.type);
        return true;
      });

  const handleRefresh = () => {
    refetchWallet();
    refetchTx();
    toast.success('Atualizado!');
  };

  if (!user || ownerType === null || walletLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-accent rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-foreground flex-1">Carteira Digital</h1>
        <button onClick={handleRefresh} className="p-2 hover:bg-accent rounded-xl text-muted-foreground">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Toggle cliente/prestador (somente se for prestador) */}
      {isProvider && (
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setOwnerType('cliente')}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${ownerType === 'cliente' ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground'}`}
          >
            👤 Cliente
          </button>
          <button
            onClick={() => setOwnerType('prestador')}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${ownerType === 'prestador' ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground'}`}
          >
            🔧 Prestador
          </button>
        </div>
      )}

      {/* Wallet Card */}
      <div className="mb-5">
        <WalletCard wallet={wallet} ownerType={ownerType} />
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Button
          className="rounded-2xl h-12 font-bold text-sm bg-emerald-600 hover:bg-emerald-700"
          onClick={() => setShowWithdraw(true)}
          disabled={!wallet || wallet.balance < 50}
        >
          <ArrowUpCircle className="w-4 h-4 mr-2" />
          Sacar PIX
        </Button>
        <Button
          variant="outline"
          className="rounded-2xl h-12 font-bold text-sm"
          onClick={() => navigate('/recompensas')}
        >
          <Plus className="w-4 h-4 mr-2" />
          Ver Cashback
        </Button>
      </div>

      {/* Pendente info */}
      {wallet?.pending_balance > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-3 mb-5 flex items-center gap-3">
          <span className="text-xl">⏳</span>
          <div>
            <p className="text-sm font-bold text-yellow-800">
              R$ {wallet.pending_balance.toFixed(2)} pendente
            </p>
            <p className="text-xs text-yellow-700">Será liberado após confirmação dos serviços</p>
          </div>
        </div>
      )}

      {/* Transaction filter */}
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <p className="text-sm font-bold text-foreground flex-1">Extrato</p>
        <div className="flex gap-1">
          {[
            { key: 'all', label: 'Todos' },
            { key: 'in', label: 'Entradas' },
            { key: 'out', label: 'Saídas' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${filter === f.key ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {txLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : (
        <TransactionList transactions={filtered} />
      )}

      {showWithdraw && wallet && (
        <WithdrawModal
          wallet={wallet}
          onClose={() => setShowWithdraw(false)}
          onSuccess={() => {
            setShowWithdraw(false);
            refetchWallet();
            refetchTx();
          }}
        />
      )}
    </div>
  );
}