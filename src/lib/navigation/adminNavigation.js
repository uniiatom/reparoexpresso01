import {
  BarChart2, Activity, ClipboardList, PlusCircle, Calendar,
  Navigation2, UserCheck, Search, Camera, FileText, Ban,
  Tag, ArrowRightLeft, Receipt, Lock, RefreshCw,
  Percent, Ticket, Clock, CheckSquare, ListPlus, FileCheck,
  Headphones, ScrollText, LayoutDashboard, Trophy, Home, User, Settings
} from 'lucide-react';

export const ADMIN_NAV_GROUPS = [
  {
    id: 'overview',
    label: 'Visão Geral',
    items: [
      { value: 'analytics', icon: BarChart2, label: 'Analytics' },
      { value: 'metricas', icon: Activity, label: 'Métricas' },
    ],
  },
  {
    id: 'ops',
    label: 'Operações',
    items: [
      { value: 'requests', icon: ClipboardList, label: 'Chamados' },
      { value: 'novo-pedido', icon: PlusCircle, label: 'Novo Pedido' },
      { value: 'calendario', icon: Calendar, label: 'Calendário' },
      { value: 'optimizer', icon: Navigation2, label: 'Rotas' },
    ],
  },
  {
    id: 'cadastros',
    label: 'Cadastros',
    items: [
      { value: 'providers', icon: UserCheck, label: 'Prestadores', badge: 'pending' },
      { value: 'consulta-cliente', icon: Search, label: 'Clientes' },
      { value: 'photos', icon: Camera, label: 'Fotos', badge: 'pendingPhotos' },
      { value: 'documentos', icon: FileText, label: 'Documentos' },
      { value: 'blacklist', icon: Ban, label: 'Blacklist' },
    ],
  },
  {
    id: 'financial',
    label: 'Financeiro',
    items: [
      { value: 'pricing', icon: Tag, label: 'Preços' },
      { value: 'repasse', icon: ArrowRightLeft, label: 'Repasse' },
      { value: 'fechamento', icon: Calendar, label: 'Fechamento' },
      { value: 'invoices', icon: Receipt, label: 'Notas Fiscais' },
      { value: 'reserve-fund', icon: Lock, label: 'Fundo Reserva' },
      { value: 'reembolsos', icon: RefreshCw, label: 'Reembolsos' },
    ],
  },
  {
    id: 'config',
    label: 'Configurações',
    items: [
      { value: 'cashback-config', icon: Percent, label: 'Cashback' },
      { value: 'coupons', icon: Ticket, label: 'Cupons' },
      { value: 'sobretaxas', icon: Clock, label: 'Sobretaxas' },
      { value: 'checklists', icon: CheckSquare, label: 'Checklists' },
      { value: 'additional', icon: ListPlus, label: 'Pontos Extras' },
      { value: 'provider-settings', icon: Settings, label: 'Config. Prestadores' },
      { value: 'termos', icon: FileCheck, label: 'Termos Clientes' },
      { value: 'termos-prestador', icon: FileCheck, label: 'Termos Prestadores' },
    ],
  },
  {
    id: 'support',
    label: 'Suporte',
    items: [
      { value: 'tickets', icon: Headphones, label: 'Atendimento' },
      { value: 'logs', icon: ScrollText, label: 'Logs' },
    ],
  },
];

const ATTENDANT_TABS = new Set(['tickets']);

export const ADMIN_EXTERNAL_LINKS = {
  admin: [
    { to: '/inicio', icon: Home, label: 'Início' },
    { to: '/dashboard-admin', icon: LayoutDashboard, label: 'Dashboard Executivo' },
    { to: '/agenda', icon: Calendar, label: 'Agenda Geral' },
    { to: '/premiacao', icon: Trophy, label: 'Premiação' },
  ],
  attendant: [
    { to: '/inicio', icon: Home, label: 'Início' },
  ],
};

export function getAdminNavGroups(role = 'admin') {
  if (role === 'attendant') {
    return ADMIN_NAV_GROUPS
      .filter((group) => group.id === 'support')
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => ATTENDANT_TABS.has(item.value)),
      }));
  }
  return ADMIN_NAV_GROUPS;
}

export function getAdminExternalLinks(role = 'admin') {
  return ADMIN_EXTERNAL_LINKS[role] ?? ADMIN_EXTERNAL_LINKS.admin;
}

/** Itens planos para o menu em disco — espelha sidebar + perfil */
export function getAdminDiskNavItems(role = 'admin') {
  const groups = getAdminNavGroups(role);
  const external = getAdminExternalLinks(role);

  const tabItems = groups.flatMap((group) =>
    group.items.map((item) => ({
      key: `tab-${item.value}`,
      to: `/admin?tab=${item.value}`,
      tab: item.value,
      icon: item.icon,
      label: item.label,
      group: group.label,
      badge: item.badge,
    })),
  );

  const routeItems = external.map((link) => ({
    key: `route-${link.to}`,
    to: link.to,
    tab: null,
    icon: link.icon,
    label: link.label,
    group: 'Atalhos',
    badge: null,
  }));

  return [
    ...routeItems,
    ...tabItems,
    {
      key: 'route-perfil',
      to: '/perfil',
      tab: null,
      icon: User,
      label: 'Perfil',
      group: 'Conta',
      badge: null,
    },
  ];
}

export function isAdminNavItemActive(item, pathname, searchTab) {
  if (item.tab) {
    return pathname === '/admin' && (searchTab || 'analytics') === item.tab;
  }
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}
