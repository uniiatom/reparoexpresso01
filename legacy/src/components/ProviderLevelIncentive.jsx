import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Sparkles, X } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ProviderLevelIncentive({ providerId }) {
  const [incentive, setIncentive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!providerId) return;

    // Só executa uma vez por sessão por prestador
    const cacheKey = `__incentive_fetched_${providerId}`;
    if (sessionStorage.getItem(cacheKey)) {
      setLoading(false);
      return;
    }

    const fetchIncentive = async () => {
      try {
        sessionStorage.setItem(cacheKey, '1');
        const res = await base44.functions.invoke('sendProviderLevelIncentive', { providerId });
        if (res.data?.success && !res.data?.alreadyMaxLevel) {
          setIncentive(res.data);
        }
      } catch (err) {
        console.error('Erro ao buscar incentivo:', err);
      }
      setLoading(false);
    };

    fetchIncentive();
  }, [providerId]);

  if (loading || !incentive || dismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto"
    >
      <div className="relative overflow-hidden rounded-3xl shadow-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 p-0.5">
        {/* Animação de piscada no fundo */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 opacity-0"
          animate={{ opacity: [0, 0.3, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        />

        {/* Conteúdo */}
        <div className="relative bg-card rounded-[28px] p-5">
          <div className="flex items-start gap-3">
            {/* Ícone piscante */}
            <motion.div
              animate={{ scale: [1, 1.2, 1], rotate: [0, 15, -15, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-2xl flex-shrink-0 mt-1"
            >
              ✨
            </motion.div>

            <div className="flex-1 min-w-0">
              <p className="font-black text-foreground text-sm leading-tight mb-1">
                🚀 {incentive.message}
              </p>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {incentive.jobsNeeded > 0 && (
                  <span>📊 {incentive.jobsNeeded} serviço(s) faltando</span>
                )}
                {incentive.ratingNeeded > 0 && (
                  <span>⭐ {incentive.ratingNeeded}⭐ de avaliação</span>
                )}
              </div>
            </div>

            {/* Botão fechar */}
            <button
              onClick={() => setDismissed(true)}
              className="flex-shrink-0 mt-1 p-1 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Barra de progresso animada */}
          <motion.div
            className="mt-3 h-1 bg-muted rounded-full overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-red-500"
              animate={{ width: ['0%', '100%'] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}