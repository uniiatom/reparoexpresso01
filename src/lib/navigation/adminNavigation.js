import {
  BarChart2, Activity, ClipboardList, PlusCircle, Calendar,
  Navigation2, UserCheck, Search, Camera, FileText, Ban,
  Tag, ArrowRightLeft, Receipt, Lock, RefreshCw,
  Percent, Ticket, Clock, CheckSquare, ListPlus, FileCheck,
  Headphones, ScrollText, LayoutDashboard, Trophy, Home, User, Settings,
  DollarSign, Users, Layers, Images, MapPin,
} from 'lucide-react';

export const ADMIN_NAV_GROUPS = [
  {
    id: 'overview',
    label: 'Visão Geral',
    icon: BarChart2,
    items: [
      { value: 'analytics', icon: BarChart2, label: 'Analytics' },
      { value: 'metricas', icon: Activity, label: 'Métricas' },
    ],
  },
  {
    id: 'ops',
    label: 'Operações',
    icon: ClipboardList,
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
    icon: Users,
    items: [
      { value: 'servicos-prestados', icon: Layers, label: 'Serviços Prestados' },
      { value: 'locais-atuacao', icon: MapPin, label: 'Locais de Atuação', badge: 'pendingCoverage' },
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
    icon: DollarSign,
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
    icon: Settings,
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
    icon: Headphones,
    items: [
      { value: 'tickets', icon: Headphones, label: 'Atendimento' },
      { value: 'logs', icon: ScrollText, label: 'Logs' },
      { value: 'biblioteca', icon: Images, label: 'Biblioteca' },
    ],
  },
];

const ATTENDANT_TABS = new Set(['tickets']);

export const ADMIN_EXTERNAL_LINKS = {
  admin: [
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

/** Retorna o id do menu que contém a aba informada. */
export function getAdminMenuIdForTab(tab, role = 'admin') {
  const groups = getAdminNavGroups(role);
  const match = groups.find((group) => group.items.some((item) => item.value === tab));
  return match?.id ?? null;
}

/** Estrutura hierárquica compartilhada entre sidebar e menu em disco. */
export function getAdminDiskNavStructure(role = 'admin') {
  const groups = getAdminNavGroups(role);
  const external = getAdminExternalLinks(role);

  const menus = groups.map((group) => ({
    id: group.id,
    key: `menu-${group.id}`,
    type: 'menu',
    label: group.label,
    icon: group.icon,
    items: group.items.map((item) => ({
      key: `tab-${item.value}`,
      type: 'submenu',
      to: `/admin?tab=${item.value}`,
      tab: item.value,
      icon: item.icon,
      label: item.label,
      menuId: group.id,
      menuLabel: group.label,
      badge: item.badge ?? null,
    })),
  }));

  const shortcuts = external.map((link) => ({
    key: `route-${link.to}`,
    type: 'route',
    to: link.to,
    tab: null,
    icon: link.icon,
    label: link.label,
  }));

  const profile = {
    key: 'route-perfil',
    type: 'route',
    to: '/perfil',
    tab: null,
    icon: User,
    label: 'Perfil',
  };

  return { menus, shortcuts, profile };
}

/** Lista plana (legado) — prefira getAdminDiskNavStructure. */
export function getAdminDiskNavItems(role = 'admin') {
  const { menus, shortcuts, profile } = getAdminDiskNavStructure(role);

  const tabItems = menus.flatMap((menu) =>
    menu.items.map((item) => ({
      ...item,
      group: menu.label,
    })),
  );

  const routeItems = shortcuts.map((link) => ({
    ...link,
    group: 'Atalhos',
    badge: null,
  }));

  return [
    ...routeItems,
    ...tabItems,
    { ...profile, group: 'Conta', badge: null },
  ];
}

export function isAdminNavItemActive(item, pathname, searchTab) {
  if (item.type === 'menu' || item.type === 'back') return false;
  if (item.tab) {
    return pathname === '/admin' && (searchTab || 'analytics') === item.tab;
  }
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}
