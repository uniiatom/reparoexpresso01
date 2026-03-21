import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Copy, Share2, Gift, Users, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function ReferralCard({ user }) {
  const [referralCode, setReferralCode] = useState('');
  const [copied, setCopied] = useState(false);

  // Gerar código de referência único
  useEffect(() => {
    if (user?.id && !referralCode) {
      const code = `ref_${user.id.slice(0, 8).toUpperCase()}`;
      setReferralCode(code);
    }
  }, [user?.id, referralCode]);

  // Buscar estatísticas de referências
  const { data: referrals = [] } = useQuery({
    queryKey: ['referrals', user?.id],
    queryFn: () => base44.entities.Referral.filter({ referrer_id: user?.id }),
    enabled: !!user?.id,
  });

  const completedReferrals = referrals.filter(r => r.reward_status === 'confirmada' || r.reward_status === 'paga');
  const totalEarnings = completedReferrals.length * 10;
  const pendingReferrals = referrals.filter(r => r.reward_status === 'pendente');

  const handleCopyCode = () => {
    const text = `${window.location.origin}?ref=${referralCode}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const text = `Me Socorro - Indique e ganhe R$ 10! 💰\n\nUse meu código de referência: ${referralCode}\n\nCada serviço que você contratar, eu ganho R$ 10 de bônus!`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Me Socorro - Indique e Ganhe',
          text: text,
        });
      } catch (err) {
        console.log('Compartilhamento cancelado');
      }
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Mensagem copiada!');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Ganhos */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-3xl p-6 border border-primary/20">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Ganhos até agora</p>
            <h2 className="text-4xl font-bold text-primary">R$ {totalEarnings.toFixed(2)}</h2>
            <p className="text-xs text-muted-foreground mt-2">
              {completedReferrals.length} serviço{completedReferrals.length !== 1 ? 's' : ''} contratado{completedReferrals.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center">
            <Gift className="w-8 h-8 text-primary" />
          </div>
        </div>

        {pendingReferrals.length > 0 && (
          <div className="bg-white/50 rounded-2xl p-3 text-sm">
            <p className="text-amber-700 font-semibold">
              ⏳ {pendingReferrals.length} indicação{pendingReferrals.length !== 1 ? 's' : ''} aguardando confirmação
            </p>
          </div>
        )}
      </div>

      {/* Código de Referência */}
      <div className="bg-card rounded-3xl p-6 border border-border">
        <p className="text-sm font-semibold text-foreground mb-3">Seu código de referência</p>
        <div className="flex items-center gap-2 p-3 bg-muted rounded-2xl mb-4">
          <code className="flex-1 text-sm font-mono font-bold text-foreground">{referralCode}</code>
          <button
            onClick={handleCopyCode}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <Copy className={`w-4 h-4 transition-all ${copied ? 'text-green-600' : 'text-muted-foreground'}`} />
          </button>
        </div>

        <div className="space-y-2 mb-4">
          <Button
            onClick={handleShare}
            className="w-full bg-primary text-primary-foreground rounded-2xl h-10 font-semibold"
          >
            <Share2 className="w-4 h-4 mr-2" /> Compartilhar
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          📱 Compartilhe seu código com amigos. Quando eles contratarem um serviço usando sua indicação, você ganha R$ 10!
        </p>
      </div>

      {/* Como funciona */}
      <div className="bg-card rounded-3xl p-6 border border-border">
        <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" /> Como funciona
        </p>
        <div className="space-y-2 text-xs text-muted-foreground">
          <p className="flex items-start gap-2">
            <span className="text-primary font-bold flex-shrink-0">1.</span>
            <span>Compartilhe seu código de referência com amigos</span>
          </p>
          <p className="flex items-start gap-2">
            <span className="text-primary font-bold flex-shrink-0">2.</span>
            <span>Eles usam seu código ao solicitar um serviço</span>
          </p>
          <p className="flex items-start gap-2">
            <span className="text-primary font-bold flex-shrink-0">3.</span>
            <span>Quando o serviço é concluído, você recebe R$ 10</span>
          </p>
          <p className="flex items-start gap-2">
            <span className="text-primary font-bold flex-shrink-0">4.</span>
            <span>Acumule ganhos ilimitados!</span>
          </p>
        </div>
      </div>

      {/* Histórico de Indicações */}
      {referrals.length > 0 && (
        <div className="bg-card rounded-3xl p-6 border border-border">
          <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> Minhas indicações ({referrals.length})
          </p>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {referrals.map((referral, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-2xl text-xs">
                <div>
                  <p className="font-semibold text-foreground">{referral.referred_client_name || 'Cliente'}</p>
                  <p className="text-muted-foreground">{referral.referred_client_email}</p>
                </div>
                <span className={`px-2 py-1 rounded-lg font-semibold ${
                  referral.reward_status === 'confirmada' ? 'bg-green-100 text-green-700' :
                  referral.reward_status === 'paga' ? 'bg-blue-100 text-blue-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {referral.reward_status === 'confirmada' ? '✓ Confirmada' :
                   referral.reward_status === 'paga' ? '💰 Paga' :
                   '⏳ Pendente'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}