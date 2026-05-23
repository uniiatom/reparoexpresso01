import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Shield,
  LayoutDashboard,
  Wrench,
  ClipboardList,
  DollarSign,
  Users,
  Ticket,
  Gift,
  FileText,
  PlusCircle,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import { ROLES } from '@/lib/auth/roles';

const ADMIN_SECTIONS = [
  {
    title: 'Operação',
    items: [
      { icon: ClipboardList, label: 'Chamados e OS', desc: 'Acompanhe, cancele e gerencie solicitações', to: '/admin?tab=requests' },
      { icon: PlusCircle, label: 'Criar pedido', desc: 'Abrir OS em nome de um cliente', to: '/admin?tab=novo-pedido' },
      { icon: Users, label: 'Prestadores', desc: 'Aprovar, bloquear e revisar cadastros', to: '/admin?tab=providers' },
    ],
  },
  {
    title: 'Serviços e configurações',
    items: [
      { icon: DollarSign, label: 'Preços por região', desc: 'Cadastrar e editar serviços ofertados', to: '/admin?tab=pricing' },
      { icon: Wrench, label: 'Checklists e pontos', desc: 'Regras técnicas dos serviços', to: '/admin?tab=checklists' },
      { icon: Gift, label: 'Cupons e cashback', desc: 'Promoções e fidelidade', to: '/admin?tab=coupons' },
      { icon: FileText, label: 'Termos e documentos', desc: 'Termos de cliente e prestador', to: '/admin?tab=termos' },
    ],
  },
  {
    title: 'Suporte e métricas',
    items: [
      { icon: Ticket, label: 'Tickets', desc: 'Atendimento ao cliente', to: '/admin?tab=tickets' },
      { icon: BarChart3, label: 'Analytics', desc: 'Indicadores da operação', to: '/admin?tab=analytics' },
      { icon: LayoutDashboard, label: 'Dashboard executivo', desc: 'Visão gerencial avançada', to: '/dashboard-admin' },
    ],
  },
];

function AdminCard({ item }) {
  const Icon = item.icon;
  return (
    <Link to={item.to} className="block group h-full">
      <motion.div
        whileHover={{ y: -2 }}
        className="h-full bg-card border border-border rounded-2xl p-4 hover:border-primary/40 hover:bg-accent/30 transition-colors"
      >
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center"
        >
          <Icon className="w-5 h-5 text-primary" />
        </motion.div>
        <p className="font-semibold text-foreground mt-3">{item.label}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
        <p className="text-xs text-primary font-semibold mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
          Acessar →
        </p>
      </motion.div>
    </Link>
  );
}

function AdminHeader({ user, isAttendant }) {
  return (
    <div className="w-full px-3 sm:px-6 lg:px-10 pt-6">
      <div className="bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/25 rounded-3xl p-6 sm:p-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-4"
        >
          <motion.div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
            <Shield className="w-6 h-6 text-primary" />
          </motion.div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary">
              {isAttendant ? 'Suporte' : 'Administração'}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mt-1">
              Olá, {user?.full_name?.split(' ')[0] || (isAttendant ? 'Atendente' : 'Admin')}
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl">
              {isAttendant
                ? 'Acesse a central de tickets para atender clientes. Você não solicita serviços por aqui — apenas gerencia o suporte.'
                : 'Gerencie serviços, prestadores, preços e chamados da plataforma. Você não precisa solicitar serviços como cliente — use os atalhos abaixo para administrar tudo.'}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function AdminHomePanel() {
  const { user } = useAuth();
  const isAttendant = user?.role === ROLES.ATTENDANT;
  const sections = isAttendant
    ? [{
        title: 'Atendimento',
        items: [{
          icon: Ticket,
          label: 'Central de tickets',
          desc: 'Responder chamados de clientes',
          to: '/admin?tab=tickets',
        }],
      }]
    : ADMIN_SECTIONS;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background pb-12"
    >
      <AdminHeader user={user} isAttendant={isAttendant} />

      <div className="w-full px-3 sm:px-6 lg:px-10 pt-6 space-y-8">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-sm font-display tracking-widest uppercase text-muted-foreground mb-3">
              {section.title}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {section.items.map((item) => (
                <AdminCard key={item.to} item={item} />
              ))}
            </div>
          </section>
        ))}

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex flex-col sm:flex-row gap-3 pt-2"
        >
          <Button asChild className="rounded-2xl h-12 font-semibold flex-1">
            <Link to="/admin">
              <Shield className="w-4 h-4 mr-2" />
              {isAttendant ? 'Abrir central de suporte' : 'Abrir painel administrativo completo'}
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-2xl h-12 font-semibold flex-1">
            <Link to="/perfil">Meu perfil</Link>
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
