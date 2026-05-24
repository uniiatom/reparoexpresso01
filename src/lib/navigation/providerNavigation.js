import {
  Home, Wrench, DollarSign, Calendar, LayoutDashboard,
  BarChart3, User,
} from 'lucide-react';

/** Itens de navegação do prestador — fonte única para sidebar e menu radial. */
export const PROVIDER_NAV_ITEMS = [
  { key: 'inicio', to: '/inicio', icon: Home, label: 'Início' },
  { key: 'prestador', to: '/prestador', icon: Wrench, label: 'Chamados' },
  { key: 'ganhos', to: '/prestador/ganhos', icon: DollarSign, label: 'Ganhos' },
  { key: 'horarios', to: '/prestador/horarios', icon: Calendar, label: 'Horários' },
  { key: 'dashboard', to: '/dashboard-prestador', icon: LayoutDashboard, label: 'Dashboard' },
  { key: 'metricas', to: '/painel-metricas', icon: BarChart3, label: 'Métricas' },
  { key: 'perfil', to: '/perfil', icon: User, label: 'Perfil' },
];

export function getProviderNavItems() {
  return PROVIDER_NAV_ITEMS;
}

/** Estrutura para o menu radial (compatível com getAdminDiskNavStructure). */
export function getProviderDiskNavStructure() {
  const items = PROVIDER_NAV_ITEMS.map((item) => ({
    ...item,
    type: 'route',
    tab: null,
  }));

  return {
    menus: [],
    shortcuts: items.filter((i) => i.key !== 'perfil'),
    profile: items.find((i) => i.key === 'perfil'),
  };
}

export function isProviderNavItemActive(item, pathname) {
  if (pathname === item.to) return true;
  if (item.to !== '/inicio' && pathname.startsWith(`${item.to}/`)) return true;
  return false;
}

/** Rotas em que o sidebar do prestador deve aparecer (área prestador). */
export function isProviderAreaPath(pathname) {
  if (!pathname) return false;
  if (pathname === '/inicio') return true;
  if (pathname.startsWith('/mapa/') || pathname.startsWith('/rastreamento/')) return true;
  return PROVIDER_NAV_ITEMS.some((item) => {
    if (item.to === '/inicio') return false;
    return isProviderNavItemActive(item, pathname);
  });
}
