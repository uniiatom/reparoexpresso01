import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, Zap, AlertCircle, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const MIN_WITHDRAWAL = 50;

export default function WithdrawModal({ wallet, onClose, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [pixKey, setPixKey] = useState(wallet?.pix_key || '');
  const [pixKeyType, setPixKeyType] = useState(wallet?.pix_key_type || 'cpf');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const available = wallet?.balance || 0;
  const amountNum = parseFloat(amount) || 0;
  const isValid = amountNum >= MIN_WITHDRAWAL && amountNum <= available && pixKey.trim().length > 0;

  const handleWithdraw = async () => {
    if (!isValid) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke('processWalletWithdrawal', {
        walletId: wallet.id,
        amount: amountNum,
        pixKey: pixKey.trim(),
        pixKeyType,
      });
      if (res.data?.success) {
        setDone(true);
        onSuccess?.();
      } else {
        toast.error(res.data?.message || 'Erro ao processar saque');
      }
    } catch (err) {
      toast.error(err.message || 'Erro ao processar saque');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 z-50"
      />
      <motion.div
        key="modal"
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
        className="fixed inset-x-4 bottom-4 z-[60] bg-card rounded-3xl p-6 shadow-2xl max-w-sm mx-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-foreground">Sacar via PIX</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl">
            <X className="w-4 h-4" />
          </button>
        </div>

        {done ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-3" />
            <p className="text-lg font-bold text-foreground">Solicitação enviada!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Seu saque de <strong>R$ {amountNum.toFixed(2)}</strong> será processado em até 2 dias úteis.
            </p>
            <Button className="w-full rounded-2xl mt-5" onClick={onClose}>Fechar</Button>
          </div>
        ) : (
          <>
            <div className="bg-muted/50 rounded-2xl p-4 mb-4">
              <p className="text-xs text-muted-foreground mb-1">Saldo disponível</p>
              <p className="text-2xl font-bold text-foreground">R$ {available.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">Mínimo para saque: R$ {MIN_WITHDRAWAL.toFixed(2)}</p>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Valor do saque (R$)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder={`Mín. R$ ${MIN_WITHDRAWAL}`}
                  className="w-full border border-border rounded-2xl px-4 py-3 text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary text-lg font-semibold"
                />
                {amountNum > available && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Valor maior que o saldo</p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Tipo de chave PIX</label>
                <select
                  value={pixKeyType}
                  onChange={e => setPixKeyType(e.target.value)}
                  className="w-full border border-border rounded-2xl px-4 py-3 text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="cpf">CPF</option>
                  <option value="cnpj">CNPJ</option>
                  <option value="email">E-mail</option>
                  <option value="telefone">Telefone</option>
                  <option value="aleatoria">Chave Aleatória</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Chave PIX</label>
                <input
                  type="text"
                  value={pixKey}
                  onChange={e => setPixKey(e.target.value)}
                  placeholder="Digite sua chave PIX"
                  className="w-full border border-border rounded-2xl px-4 py-3 text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <Button
              className="w-full h-12 rounded-2xl font-bold text-sm"
              onClick={handleWithdraw}
              disabled={!isValid || loading}
            >
              {loading ? (
                <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Processando...</span>
              ) : (
                <span className="flex items-center gap-2"><Zap className="w-4 h-4" /> Solicitar Saque de R$ {amountNum > 0 ? amountNum.toFixed(2) : '0,00'}</span>
              )}
            </Button>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}