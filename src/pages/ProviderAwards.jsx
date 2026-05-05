import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Clock, Target, Gift, RefreshCw, ChevronDown, ChevronUp, CheckCircle2, Crown, Medal, Award } from 'lucide-react';
import { toast } from "sonner";
import { cn } from '@/lib/utils';
import GoalForm from '@/components/awards/GoalForm';
import RankingCard from '@/components/awards/RankingCard';
import BonusHistoryPanel from '@/components/awards/BonusHistoryPanel';

const CURRENT_MONTH = new Date().toISOString().slice(0, 7);

function formatMonth(m) {
  if (!m) return '';
  const [year, month] = m.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export default function ProviderAwards() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [confirmRelease, setConfirmRelease] = useState(false);

  // Auth: apenas admin
  useEffect(() => {
    base44.auth.me().then(u => {
      if (!u || u.role !== 'admin') navigate('/');
    }).catch(() => navigate('/'));
  }, [navigate]);

  const { data: providers = [] } = useQuery({
    queryKey: ['awards-providers'],
    queryFn: () => base44.entities.Provider.filter({ is_approved: true }),
    refetchInterval: 30000,
  });

  const { data: allRequests = [] } = useQuery({
    queryKey: ['awards-requests', selectedMonth],
    queryFn: () => base44.entities.ServiceRequest.filter({ status: 'concluido' }),
    refetchInterval: 30000,
  });

  const { data: allReviews = [] } = useQuery({
    queryKey: ['awards-reviews'],
    queryFn: () => base44.entities.Review.list(),
    refetchInterval: 30000,
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['awards-goals'],
    queryFn: () => base44.entities.MonthlyGoal.list('-month', 12),
  });

  const { data: bonusReleases = [], refetch: refetchReleases } = useQuery({
    queryKey: ['awards-releases', selectedMonth],
    queryFn: () => base44.entities.BonusRelease.filter({ month: selectedMonth }),
  });

  const currentGoal = goals.find(g => g.month === selectedMonth);

  // Filtra serviços e reviews do mês selecionado
  const monthRequests = useMemo(() => {
    return allRequests.filter(r => r.created_date?.startsWith(selectedMonth));
  }, [allRequests, selectedMonth]);

  const monthReviews = useMemo(() => {
    return allReviews.filter(r => r.created_date?.startsWith(selectedMonth));
  }, [allReviews, selectedMonth]);

  // Constrói ranking
  const ranking = useMemo(() => {
    const map = {};

    providers.forEach(p => {
      map[p.id] = {
        provider_id: p.id,
        provider_name: p.name,
        photo_url: p.photo_url,
        jobs: 0,
        ratings: [],
        punctualities: [],
      };
    });

    monthRequests.forEach(req => {
      if (req.provider_id && map[req.provider_id]) {
        map[req.provider_id].jobs += 1;
      }
    });

    monthReviews.forEach(rev => {
      const pid = rev.provider_id || rev.professional_id;
      if (pid && map[pid]) {
        if (rev.overall_rating) map[pid].ratings.push(rev.overall_rating);
        if (rev.punctuality_rating) map[pid].punctualities.push(rev.punctuality_rating);
      }
    });

    const list = Object.values(map)
      .filter(p => p.jobs > 0)
      .map(p => {
        const avg_rating = p.ratings.length
          ? parseFloat((p.ratings.reduce((a, b) => a + b, 0) / p.ratings.length).toFixed(2))
          : 0;
        const avg_punctuality = p.punctualities.length
          ? parseFloat((p.punctualities.reduce((a, b) => a + b, 0) / p.punctualities.length).toFixed(2))
          : 0;

        // Score: 50% avaliação + 30% pontualidade + 20% volume normalizado
        const maxJobs = Math.max(...Object.values(map).map(x => x.jobs), 1);
        const score = parseFloat(
          ((avg_rating / 5) * 50 + (avg_punctuality / 5) * 30 + (p.jobs / maxJobs) * 20).toFixed(2)
        );

        const qualified = !currentGoal || (
          p.jobs >= (currentGoal.min_jobs || 0) &&
          avg_rating >= (currentGoal.min_rating || 0) &&
          avg_punctuality >= (currentGoal.min_punctuality || 0)
        );

        return { ...p, avg_rating, avg_punctuality, score, qualified };
      })
      .sort((a, b) => b.score - a.score);

    return list;
  }, [providers, monthRequests, monthReviews, currentGoal]);

  // Mutação para salvar meta
  const saveMutation = useMutation({
    mutationFn: (data) => currentGoal
      ? base44.entities.MonthlyGoal.update(currentGoal.id, data)
      : base44.entities.MonthlyGoal.create({ ...data, month: selectedMonth }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['awards-goals'] });
      toast.success('Meta salva com sucesso!');
      setShowGoalForm(false);
    },
  });

  // Mutação para liberar bônus
  const releaseMutation = useMutation({
    mutationFn: async () => {
      if (!currentGoal) throw new Error('Nenhuma meta definida');

      // Marca meta como liberada
      await base44.entities.MonthlyGoal.update(currentGoal.id, {
        bonus_released: true,
        released_at: new Date().toISOString(),
      });

      const bonusValues = [currentGoal.bonus_1st, currentGoal.bonus_2nd, currentGoal.bonus_3rd];
      const qualified = ranking.filter(p => p.qualified).slice(0, 3);

      // Cria registros de bônus
      await Promise.all(
        qualified.map((p, i) =>
          base44.entities.BonusRelease.create({
            month: selectedMonth,
            goal_id: currentGoal.id,
            provider_id: p.provider_id,
            provider_name: p.provider_name,
            rank: i + 1,
            score: p.score,
            jobs_completed: p.jobs,
            avg_rating: p.avg_rating,
            avg_punctuality: p.avg_punctuality,
            bonus_amount: bonusValues[i] || 0,
            status: 'pendente',
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['awards-goals'] });
      queryClient.invalidateQueries({ queryKey: ['awards-releases', selectedMonth] });
      toast.success('Bônus liberados com sucesso! Registros criados para pagamento.');
      setConfirmRelease(false);
    },
    onError: (e) => toast.error(e.message || 'Erro ao liberar bônus'),
  });

  // Gera lista de meses (12 últimos + atual)
  const monthOptions = useMemo(() => {
    const opts = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      opts.push(d.toISOString().slice(0, 7));
    }
    return opts;
  }, []);

  const top3 = ranking.filter(p => p.qualified).slice(0, 3);
  const alreadyReleased = currentGoal?.bonus_released || bonusReleases.length > 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-foreground">Premiação de Prestadores</h1>
            <p className="text-sm text-muted-foreground">Ranking em tempo real · Bônus mensais</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {monthOptions.map(m => (
              <option key={m} value={m}>{formatMonth(m)}</option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 rounded-xl"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['awards-providers'] })}
          >
            <RefreshCw className="w-4 h-4" /> Atualizar
          </Button>
          <Button
            size="sm"
            className="gap-2 rounded-xl"
            onClick={() => setShowGoalForm(s => !s)}
          >
            <Target className="w-4 h-4" /> {currentGoal ? 'Editar Meta' : 'Definir Meta'}
          </Button>
        </div>
      </div>

      {/* Formulário de meta */}
      {showGoalForm && (
        <GoalForm
          goal={currentGoal}
          month={selectedMonth}
          onSave={(data) => saveMutation.mutate(data)}
          onCancel={() => setShowGoalForm(false)}
          loading={saveMutation.isPending}
        />
      )}

      {/* Meta atual */}
      {currentGoal && (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm font-bold text-amber-800 mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4" /> Meta de {formatMonth(selectedMonth)}
                </p>
                <div className="flex gap-4 flex-wrap text-xs text-amber-700">
                  <span>🔧 Mín. {currentGoal.min_jobs} serviços</span>
                  <span>⭐ Avaliação ≥ {currentGoal.min_rating}</span>
                  <span>⏱️ Pontualidade ≥ {currentGoal.min_punctuality || '—'}</span>
                </div>
              </div>
              <div className="flex gap-3 flex-wrap text-center">
                {[
                  { label: '🥇 1º lugar', val: currentGoal.bonus_1st },
                  { label: '🥈 2º lugar', val: currentGoal.bonus_2nd },
                  { label: '🥉 3º lugar', val: currentGoal.bonus_3rd },
                ].filter(b => b.val).map(b => (
                  <div key={b.label} className="bg-white border border-amber-200 rounded-xl px-3 py-2">
                    <p className="text-xs text-amber-600">{b.label}</p>
                    <p className="font-bold text-amber-800">R$ {b.val?.toLocaleString('pt-BR')}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Botão liberar bônus */}
            <div className="mt-4 border-t border-amber-200 pt-4">
              {alreadyReleased ? (
                <div className="flex items-center gap-2 text-green-700 text-sm font-semibold">
                  <CheckCircle2 className="w-4 h-4" /> Bônus liberados em {currentGoal.released_at ? new Date(currentGoal.released_at).toLocaleDateString('pt-BR') : '—'}
                </div>
              ) : confirmRelease ? (
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="text-sm text-foreground font-semibold flex-1">
                    Confirmar liberação de bônus para os top 3 qualificados?
                  </p>
                  <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setConfirmRelease(false)}>
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white gap-2"
                    onClick={() => releaseMutation.mutate()}
                    disabled={releaseMutation.isPending || top3.length === 0}
                  >
                    <Gift className="w-4 h-4" />
                    {releaseMutation.isPending ? 'Liberando...' : 'Sim, liberar bônus'}
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white gap-2"
                  onClick={() => setConfirmRelease(true)}
                  disabled={top3.length === 0}
                >
                  <Gift className="w-4 h-4" /> Liberar Bonificações Automáticas
                  {top3.length > 0 && <Badge className="ml-1 bg-white/20 text-white border-0">{top3.length}</Badge>}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!currentGoal && !showGoalForm && (
        <div className="text-center py-6 bg-muted/30 rounded-2xl border border-dashed border-border">
          <Target className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhuma meta definida para {formatMonth(selectedMonth)}</p>
          <Button size="sm" className="mt-3 rounded-xl gap-2" onClick={() => setShowGoalForm(true)}>
            <Target className="w-4 h-4" /> Definir Meta
          </Button>
        </div>
      )}

      {/* Pódio Top 3 */}
      {ranking.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 0, 2].map((rankIdx, col) => {
            const p = ranking.filter(r => r.qualified)[rankIdx];
            if (!p) return <div key={col} className="hidden sm:block" />;
            const medals = [
              { icon: Crown, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200', label: '1º lugar' },
              { icon: Medal, color: 'text-slate-400', bg: 'bg-slate-50 border-slate-200', label: '2º lugar' },
              { icon: Award, color: 'text-orange-400', bg: 'bg-orange-50 border-orange-200', label: '3º lugar' },
            ];
            const m = medals[rankIdx];
            const Icon = m.icon;
            const bonusValues = currentGoal ? [currentGoal.bonus_1st, currentGoal.bonus_2nd, currentGoal.bonus_3rd] : [];
            return (
              <Card key={col} className={cn('border', m.bg, rankIdx === 0 && 'sm:order-2 sm:scale-105 shadow-md')}>
                <CardContent className="p-4 text-center">
                  <Icon className={cn('w-8 h-8 mx-auto mb-2', m.color)} />
                  <p className="text-xs font-bold text-muted-foreground mb-1">{m.label}</p>
                  <div className="w-14 h-14 rounded-full bg-muted mx-auto mb-2 overflow-hidden flex items-center justify-center text-xl font-bold text-foreground">
                    {p.photo_url
                      ? <img src={p.photo_url} alt={p.provider_name} className="w-full h-full object-cover" />
                      : p.provider_name?.charAt(0)}
                  </div>
                  <p className="font-bold text-foreground text-sm">{p.provider_name}</p>
                  <div className="flex justify-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>⭐ {p.avg_rating}</span>
                    <span>⏱️ {p.avg_punctuality}</span>
                    <span>🔧 {p.jobs}</span>
                  </div>
                  <div className="mt-2 text-sm font-extrabold text-primary">
                    Score: {p.score}
                  </div>
                  {bonusValues[rankIdx] > 0 && (
                    <div className="mt-2 text-xs bg-amber-100 text-amber-800 rounded-lg px-2 py-1 font-bold">
                      🎁 R$ {bonusValues[rankIdx]?.toLocaleString('pt-BR')}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Ranking completo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Star className="w-4 h-4 text-amber-500" /> Ranking Completo — {formatMonth(selectedMonth)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {ranking.length === 0 ? (
            <div className="text-center py-10">
              <Trophy className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum prestador com serviços concluídos neste mês</p>
            </div>
          ) : ranking.map((p, i) => (
            <RankingCard key={p.provider_id} rank={i + 1} provider={p} goal={currentGoal} />
          ))}
        </CardContent>
      </Card>

      {/* Histórico de bônus liberados */}
      <div>
        <button
          className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground mb-3"
          onClick={() => setShowHistory(s => !s)}
        >
          <Gift className="w-4 h-4" /> Histórico de Bônus Liberados
          {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showHistory && (
          <BonusHistoryPanel month={selectedMonth} releases={bonusReleases} />
        )}
      </div>
    </div>
  );
}