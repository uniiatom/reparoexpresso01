import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import CashbackPanel from '@/components/CashbackPanel';
import RecurringServiceCalendar from '@/components/RecurringServiceCalendar';
import ClientNotificationCenter from '@/components/ClientNotificationCenter';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, LogOut, Calendar, Gift, Camera, Wrench, FileText,
  Wallet, Trophy, User, Mail, Shield, CheckCircle2, Clock, Activity,
  ChevronRight,
} from 'lucide-react';
import ClientTicketForm from '@/components/ClientTicketForm';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import ServiceHistory from '@/components/ServiceHistory';
import ChangePasswordForm from '@/components/auth/ChangePasswordForm';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ── Card wrapper igual ao admin ───────────────────────────────────────────────
function AdminCard({ children, className }) {
  return (
    <div className={cn('rounded-2xl border border-white/[0.07] bg-card/60 backdrop-blur-sm overflow-hidden', className)}>
      {children}
    </div>
  );
}

function CardSection({ icon: Icon, title, children, className }) {
  return (
    <AdminCard className={className}>
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-white/[0.06]">
        <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-primary" />
        </div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>
      <div className="px-5 py-4">{children}</div>
    </AdminCard>
  );
}

function StatBadge({ label, value, colorClass }) {
  return (
    <div className="flex-1 bg-background/40 rounded-xl px-3 py-2.5 text-center border border-white/[0.05]">
      <p className={cn('text-xl font-bold', colorClass)}>{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function ActionLink({ to, icon: Icon, label, badge, colorClass = 'border-primary/25 text-primary', state }) {
  return (
    <Link to={to} state={state}>
      <div className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl border transition-all hover:bg-white/[0.03]',
        colorClass,
      )}>
        <Icon className="w-4 h-4 shrink-0" />
        <span className="flex-1 text-sm font-semibold">{label}</span>
        {badge && (
          <span className="text-[10px] bg-orange-500/15 text-orange-400 border border-orange-500/25 px-2 py-0.5 rounded-full font-semibold">
            {badge}
          </span>
        )}
        <ChevronRight className="w-3.5 h-3.5 opacity-50" />
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function UserProfile() {
  const navigate = useNavigate();
  const { user, isLoadingAuth, logout } = useAuth();
  const [userLoading, setUserLoading] = useState(true);

  useEffect(() => {
    if (isLoadingAuth) return;
    if (!user) navigate('/');
    setUserLoading(false);
  }, [isLoadingAuth, user, navigate]);

  const { data: client } = useQuery({
    queryKey: ['my-client-profile'],
    queryFn: async () => {
      if (!user?.id) return null;
      const list = await base44.entities.Client.filter({ user_id: user.id });
      return list[0] || null;
    },
    enabled: !!user?.id,
  });

  const { data: provider } = useQuery({
    queryKey: ['my-provider-profile'],
    queryFn: async () => {
      if (!user?.id) return null;
      const list = await base44.entities.Provider.filter({ user_id: user.id });
      return list[0] || null;
    },
    enabled: !!user?.id,
  });

  const { data: serviceRequests = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['user-service-history'],
    queryFn: async () => {
      if (!user?.email) return [];
      const all = await base44.entities.ServiceRequest.list('-updated_date', 100);
      return all.filter(s => s.created_by === user.email);
    },
    enabled: !!user?.email,
  });

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const stats = {
    total:     serviceRequests.length,
    completed: serviceRequests.filter(s => s.status === 'concluido').length,
    pending:   serviceRequests.filter(s =>
      ['aguardando', 'aceito', 'a_caminho', 'em_andamento'].includes(s.status)
    ).length,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ── PAGE WRAPPER — full-width desktop, same as admin ── */}
      <div className="px-4 py-6 lg:px-8 xl:px-12">

        {/* ── HEADER BAR ── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/inicio')}
              className="p-2 hover:bg-white/[0.06] rounded-xl transition-colors border border-white/[0.06]"
            >
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">Meu Perfil</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Gerencie seus dados e preferências</p>
            </div>
          </div>
          {client?.id && <ClientNotificationCenter clientId={client.id} userId={user?.id} />}
        </motion.div>

        {/* ── PROFILE HERO CARD (full-width) ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent overflow-hidden"
        >
          <div className="px-5 py-5 flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-black text-primary">
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : '?'}
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-foreground leading-tight">
                {user?.full_name || 'Usuário'}
              </h2>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Mail className="w-3 h-3" /> {user?.email}
                </p>
                {user?.role && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    <span className="capitalize">{user.role}</span>
                  </p>
                )}
                {user?.created_date && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Membro desde {new Date(user.created_date).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
            </div>

            {/* Stats row */}
            <div className="flex gap-2 sm:gap-3 shrink-0">
              <StatBadge label="Serviços" value={stats.total} colorClass="text-primary" />
              <StatBadge label="Concluídos" value={stats.completed} colorClass="text-emerald-400" />
              <StatBadge label="Ativos" value={stats.pending} colorClass="text-amber-400" />
            </div>
          </div>
        </motion.div>

        {/* ── DESKTOP 2-COLUMN GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── COL LEFT (1/3): Dados + Ações ── */}
          <div className="space-y-4">

            {/* Ações rápidas */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.10 }}
            >
              <CardSection icon={Activity} title="Acesso rápido">
                <div className="space-y-2">
                  <ActionLink
                    to="/carteira"
                    icon={Wallet}
                    label="Minha Carteira Digital"
                    colorClass="border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/[0.04]"
                  />
                  <ActionLink
                    to="/minha-ficha"
                    icon={FileText}
                    label="Minha Ficha de Serviços"
                    colorClass="border-primary/25 text-primary hover:bg-primary/[0.04]"
                  />
                  {provider && (
                    <>
                      <ActionLink
                        to="/prestador"
                        icon={Wrench}
                        label="Painel do Prestador"
                        colorClass="border-primary/25 text-primary hover:bg-primary/[0.04]"
                      />
                      <ActionLink
                        to="/prestador"
                        state={{ tab: 'fotos' }}
                        icon={Camera}
                        label="Editar minhas fotos"
                        badge={provider.photos_pending_review ? 'Pendente' : undefined}
                        colorClass="border-amber-500/25 text-amber-400 hover:bg-amber-500/[0.04]"
                      />
                    </>
                  )}
                  <ActionLink
                    to="/jornada"
                    icon={Trophy}
                    label="Minha Jornada & Conquistas"
                    colorClass="border-amber-500/25 text-amber-400 hover:bg-amber-500/[0.04]"
                  />
                  <ActionLink
                    to="/recompensas"
                    icon={Gift}
                    label="Programa de Fidelidade"
                    colorClass="border-primary/25 text-primary hover:bg-primary/[0.04]"
                  />
                </div>
              </CardSection>
            </motion.div>

            {/* Segurança */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14 }}
            >
              <CardSection icon={Shield} title="Segurança">
                <ChangePasswordForm />
              </CardSection>
            </motion.div>

            {/* Sair */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16 }}
            >
              <Button
                onClick={handleLogout}
                variant="outline"
                className="w-full rounded-xl h-10 text-destructive border-destructive/30 hover:bg-destructive/8 text-sm font-semibold gap-2"
              >
                <LogOut className="w-4 h-4" /> Sair da conta
              </Button>
            </motion.div>
          </div>

          {/* ── COL RIGHT (2/3): Serviços + Cashback + Contato ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Serviços Preventivos */}
            {client?.id && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.10 }}
              >
                <AdminCard>
                  <div className="px-5 py-4">
                    <RecurringServiceCalendar clientId={client.id} />
                  </div>
                </AdminCard>
              </motion.div>
            )}

            {/* Cashback */}
            {user?.id && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
              >
                <CardSection icon={Gift} title="Meu Cashback">
                  <CashbackPanel userId={user.id} ownerType="cliente" />
                </CardSection>
              </motion.div>
            )}

            {/* Histórico de Serviços */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14 }}
            >
              <CardSection icon={Clock} title="Histórico de Serviços">
                {servicesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  </div>
                ) : serviceRequests.length === 0 ? (
                  <div className="bg-muted/30 rounded-xl p-8 text-center border border-white/[0.05]">
                    <CheckCircle2 className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhum serviço solicitado ainda</p>
                  </div>
                ) : (
                  <ServiceHistory serviceRequests={serviceRequests} />
                )}
              </CardSection>
            </motion.div>

            {/* Fale Conosco */}
            {client?.id && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16 }}
              >
                <CardSection icon={FileText} title="Fale Conosco">
                  <ClientTicketForm
                    clientId={client.id}
                    clientName={user?.full_name}
                    clientEmail={user?.email}
                  />
                </CardSection>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
