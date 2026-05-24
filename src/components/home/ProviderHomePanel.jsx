import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Smartphone,
  ClipboardList,
  BadgeCheck,
  Star,
  UserCheck,
  UserPlus,
  Wrench,
  DollarSign,
  Calendar,
  LayoutDashboard,
  Clock,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { isProviderRole } from '@/lib/auth/roles';
import { cn } from '@/lib/utils';

const BENEFIT_ITEMS = [
  { icon: Smartphone, title: 'App para prestadores', desc: 'Receba alertas sonoros de novos chamados no celular' },
  { icon: ClipboardList, title: 'Aceite ou recuse', desc: 'Você decide quais chamados atender' },
  { icon: BadgeCheck, title: 'Homologação gratuita', desc: 'Certificação pela Escola Prática inclusa' },
  { icon: Star, title: 'Construa reputação', desc: 'Avaliações que aumentam seus ganhos' },
];

const APP_CARDS = [
  { icon: Wrench, label: 'Painel de chamados', desc: 'Aceite OS, acompanhe rotas e chat', to: '/prestador', accent: 'from-primary/20 to-primary/5' },
  { icon: DollarSign, label: 'Meus ganhos', desc: 'Extrato, repasses e simulador', to: '/prestador/ganhos', accent: 'from-emerald-500/15 to-emerald-500/5' },
  { icon: Calendar, label: 'Horários', desc: 'Disponibilidade e indisponibilidade', to: '/prestador/horarios', accent: 'from-sky-500/15 to-sky-500/5' },
  { icon: LayoutDashboard, label: 'Dashboard', desc: 'Métricas e desempenho geral', to: '/dashboard-prestador', accent: 'from-violet-500/15 to-violet-500/5' },
];

function FeatureCard({ item, index }) {
  const Icon = item.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="card-subtle p-4 flex items-start gap-3 hover:border-primary/25 transition-colors"
    >
      <div className="w-10 h-10 rounded-xl bg-primary/12 border border-primary/20 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4.5 h-4.5 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{item.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
      </div>
    </motion.div>
  );
}

function ActionCard({ item, index }) {
  const Icon = item.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 + index * 0.06, duration: 0.32 }}
    >
      <Link
        to={item.to}
        className={cn(
          'group block h-full rounded-2xl border border-border/70 p-4',
          'bg-gradient-to-br hover:border-primary/35 transition-all duration-300',
          'hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5',
          item.accent,
        )}
      >
        <motion.div
          whileHover={{ scale: 1.04 }}
          className="w-11 h-11 rounded-xl bg-card/80 border border-white/10 flex items-center justify-center mb-3"
        >
          <Icon className="w-5 h-5 text-primary" />
        </motion.div>
        <p className="font-semibold text-foreground">{item.label}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
        <p className="text-xs text-primary font-semibold mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
          Acessar →
        </p>
      </Link>
    </motion.div>
  );
}

function GuestActions() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
      <Link to="/prestador" className="block">
        <Button className="w-full h-12 rounded-2xl font-bold text-sm shadow-lg shadow-primary/15">
          <UserCheck className="w-4 h-4 mr-2" /> Já sou cadastrado — Entrar
        </Button>
      </Link>
      <Link to="/cadastro-prestador" className="block">
        <Button variant="outline" className="w-full h-12 rounded-2xl font-bold text-sm border-primary/25 hover:bg-primary/5">
          <UserPlus className="w-4 h-4 mr-2" /> Quero me cadastrar
        </Button>
      </Link>
    </div>
  );
}

export default function ProviderHomePanel() {
  const { user } = useAuth();

  const { data: provider, isLoading } = useQuery({
    queryKey: ['my-provider', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const list = await base44.entities.Provider.filter({ user_id: user.id });
      return list[0] || null;
    },
    enabled: Boolean(user?.id),
  });

  const isApproved = Boolean(provider?.is_approved);
  const isPending = Boolean(provider && !provider.is_approved && !provider.is_blocked);
  const showGuestFlow = !user || (!isLoading && !provider && !isProviderRole(user?.role));

  return (
    <motion.div key="prestador" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {isApproved ? (
        <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/12 via-primary/5 to-transparent p-4 sm:p-5">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3"
          >
            <div className="w-11 h-11 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Conta ativa</p>
              <h2 className="text-lg sm:text-xl font-bold text-foreground mt-0.5">
                Olá, {provider?.name?.split(' ')[0] || user?.full_name?.split(' ')[0] || 'Prestador'}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Seu cadastro foi aprovado. Acesse o painel para receber chamados.
              </p>
            </div>
          </motion.div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center">
          Faça parte da nossa rede de profissionais homologados pela{' '}
          <span className="font-semibold text-foreground">Escola Prática</span>
        </p>
      )}

      {!isApproved && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {BENEFIT_ITEMS.map((item, index) => (
            <FeatureCard key={item.title} item={item} index={index} />
          ))}
        </div>
      )}

      {isPending && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/8 p-4 flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-200">Cadastro em análise</p>
            <p className="text-xs text-amber-200/70 mt-1 leading-relaxed">
              Nossa equipe está revisando seus documentos. Você será notificado quando o acesso for liberado.
            </p>
          </div>
        </div>
      )}

      {isApproved && (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Seu painel</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {APP_CARDS.map((item, index) => (
              <ActionCard key={item.to} item={item} index={index} />
            ))}
          </div>
        </div>
      )}

      {showGuestFlow && !isPending && <GuestActions />}

      {!isApproved && user && !provider && !isLoading && (
        <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">Complete seu cadastro</p>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Sua conta existe, mas ainda não há ficha de prestador vinculada.
            </p>
            <Link to="/cadastro-prestador">
              <Button size="sm" className="rounded-xl">Cadastrar como prestador</Button>
            </Link>
          </div>
        </div>
      )}
    </motion.div>
  );
}
