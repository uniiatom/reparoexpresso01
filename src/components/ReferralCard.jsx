import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Share2, Gift, Users, TrendingUp, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function ReferralCard({ user }) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  // Busca perfil de cliente para pegar o código salvo
  const { data: clientProfile } = useQuery({
    queryKey: ['client-profile-referral', user?.id],
    queryFn: () => base44.entities.Client.filter({ user_id: user.id }),
    enabled: !!user?.id,
    select: (data) => data[0] || null,
  });

  // Código: usa o salvo no perfil ou gera um padrão
  const defaultCode = user?.id ? `RE${user.id.slice(0, 6).toUpperCase()}` : '';
  const referralCode = clientProfile?.referral_code || defaultCode;

  // Buscar estatísticas de indicações
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
    const text = `Reparo Expresso - Indique e ganhe R$ 10! 💰\n\nUse meu código de indicação: ${referralCode}\n\nCada serviço que você contratar, eu ganho R$ 10 de bônus!\n\n${window.location.origin}?ref=${referralCode}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Reparo Expresso - Indique e Ganhe', text });
      } catch {}
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Mensagem copiada!');
    }
  };

  const startEdit = () => {
    setEditValue(referralCode);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditValue('');
  };

  const saveCode = async () => {
    const clean = editValue.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length < 4) {
      toast.error('Código deve ter pelo menos 4 caracteres (letras e números)');
      return;
    }
    if (clean === referralCode) { cancelEdit(); return; }

    setSaving(true);
    try {
      // Verifica se o código já existe para outro usuário
      const existing = await base44.entities.Referral.filter({ referral_code: clean });
      const usedByOther = existing.some(r => r.referrer_id !== user.id);
      if (usedByOther) {
        toast.error('Este código já está em uso. Escolha outro.');
        setSaving(false);
        return;
      }

      if (clientProfile?.id) {
        await base44.entities.Client.update(clientProfile.id, { referral_code: clean });
      } else {
        await base44.entities.Client.create({ user_id: user.id, name: user.full_name || '', phone: '', referral_code: clean });
      }
      queryClient.invalidateQueries({ queryKey: ['client-profile-referral', user?.id] });
      toast.success('Código de indicação atualizado!');
      setEditing(false);
    } catch {
      toast.error('Erro ao salvar código.');
    }
    setSaving(false);
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
              ⏳ {pendingReferrals.length} indicação{pendingReferrals.length !== 1 ? 's' : ''} aguardando conclusão do serviço
            </p>
            <p className="text-amber-600 text-xs mt-1">O bônus é creditado somente após o serviço ser concluído.</p>
          </div>
        )}
      </div>

      {/* Código de Indicação */}
      <div className="bg-card rounded-3xl p-6 border border-border">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-foreground">Seu código de indicação</p>
          {!editing && (
            <button onClick={startEdit} className="flex items-center gap-1 text-xs text-primary hover:underline">
              <Pencil className="w-3 h-3" /> Editar
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input
                value={editValue}
                onChange={e => setEditValue(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder="Ex: AMIGO2024"
                className="rounded-2xl font-mono font-bold tracking-widest text-center text-base"
                maxLength={12}
                autoFocus
              />
            </div>
            <p className="text-xs text-muted-foreground">Somente letras maiúsculas e números. Mín. 4 caracteres.</p>
            <div className="flex gap-2">
              <Button onClick={saveCode} disabled={saving} className="flex-1 rounded-2xl h-10 text-sm font-bold">
                {saving ? '...' : <><Check className="w-4 h-4 mr-1" /> Salvar</>}
              </Button>
              <Button onClick={cancelEdit} variant="outline" className="flex-1 rounded-2xl h-10 text-sm">
                <X className="w-4 h-4 mr-1" /> Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-2xl mb-4">
              <code className="flex-1 text-sm font-mono font-bold text-foreground tracking-widest">{referralCode}</code>
              <button onClick={handleCopyCode} className="p-2 hover:bg-accent rounded-lg transition-colors">
                <Copy className={`w-4 h-4 transition-all ${copied ? 'text-green-600' : 'text-muted-foreground'}`} />
              </button>
            </div>

            <Button onClick={handleShare} className="w-full bg-primary text-primary-foreground rounded-2xl h-10 font-semibold mb-4">
              <Share2 className="w-4 h-4 mr-2" /> Compartilhar
            </Button>

            <p className="text-xs text-muted-foreground">
              📱 Compartilhe seu código com amigos. Quando o serviço deles for <strong>concluído</strong>, você ganha bônus de acordo com seu nível (de R$ 2,50 a R$ 7,00 por serviço). O crédito cai na carteira em até <strong>48 horas</strong>.
            </p>
          </>
        )}
      </div>

      {/* Como funciona */}
      <div className="bg-card rounded-3xl p-6 border border-border space-y-4">
        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" /> Como funciona
        </p>
        <div className="space-y-2 text-xs text-muted-foreground">
          {[
            'Compartilhe seu código de indicação com amigos',
            'Eles usam seu código ao solicitar um serviço',
            'Quando o serviço do amigo for concluído, o bônus é gerado',
            'O valor cai na sua carteira em até 48 horas após a conclusão',
            'Acumule R$ 200,00 ou mais para solicitar resgate via PIX',
          ].map((step, i) => (
            <p key={i} className="flex items-start gap-2">
              <span className="text-primary font-bold flex-shrink-0">{i + 1}.</span>
              <span>{step}</span>
            </p>
          ))}
        </div>

        {/* Tabela de progressão */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 space-y-2">
          <p className="text-xs font-bold text-emerald-900">📊 Tabela de bônus por nível de indicações:</p>
          {[
            { emoji: '🌱', nivel: 'Iniciante', amigos: '0–9', bonus: 'R$ 2,50' },
            { emoji: '⚡', nivel: 'Pro',       amigos: '10–19', bonus: 'R$ 3,50' },
            { emoji: '💎', nivel: 'Elite',     amigos: '20–34', bonus: 'R$ 4,50' },
            { emoji: '🔥', nivel: 'Lendário',  amigos: '35–49', bonus: 'R$ 5,50' },
            { emoji: '👑', nivel: 'Imperador', amigos: '50+',   bonus: 'R$ 7,00' },
          ].map(n => (
            <div key={n.nivel} className="flex items-center justify-between bg-white/70 rounded-xl px-3 py-1.5 text-xs">
              <span>{n.emoji} <strong>{n.nivel}</strong> <span className="text-muted-foreground">({n.amigos} amigos)</span></span>
              <span className="font-bold text-emerald-700">{n.bonus}/serviço</span>
            </div>
          ))}
          <p className="text-[10px] text-emerald-700 pt-1">* Amigos ativos = indicados com ao menos 1 serviço concluído.</p>
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