import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import {
  Home, Zap, ClipboardList, User, Gift, Wallet,
  Wrench, DollarSign, Calendar, BarChart3,
  LayoutDashboard, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROLES } from '@/lib/auth/roles';
import {
  getAdminDiskNavItems,
  isAdminNavItemActive,
} from '@/lib/navigation/adminNavigation';

/* ─── Nav items por perfil (cliente, prestador, parceiro) ── */
function getStandardNavItems(user) {
  const r = user?.role;

  if (r === ROLES.PROVIDER) {
    return [
      { key: 'inicio', to: '/inicio', icon: Home, label: 'Início' },
      { key: 'prestador', to: '/prestador', icon: Wrench, label: 'Chamados' },
      { key: 'ganhos', to: '/prestador/ganhos', icon: DollarSign, label: 'Ganhos' },
      { key: 'horarios', to: '/prestador/horarios', icon: Calendar, label: 'Horários' },
      { key: 'metricas', to: '/painel-metricas', icon: BarChart3, label: 'Métricas' },
      { key: 'perfil', to: '/perfil', icon: User, label: 'Perfil' },
    ];
  }

  if (r === ROLES.PARTNER) {
    return [
      { key: 'inicio', to: '/inicio', icon: Home, label: 'Início' },
      { key: 'painel', to: '/inicio', icon: LayoutDashboard, label: 'Painel' },
      { key: 'perfil', to: '/perfil', icon: User, label: 'Perfil' },
    ];
  }

  return [
    { key: 'inicio', to: '/inicio', icon: Home, label: 'Início' },
    { key: 'solicitar', to: '/solicitar', icon: Zap, label: 'Solicitar' },
    { key: 'pedidos', to: '/meus-pedidos', icon: ClipboardList, label: 'Pedidos' },
    { key: 'pontos', to: '/recompensas', icon: Gift, label: 'Pontos' },
    { key: 'carteira', to: '/carteira', icon: Wallet, label: 'Carteira' },
    { key: 'perfil', to: '/perfil', icon: User, label: 'Perfil' },
  ];
}

function isStaffRole(role) {
  return role === ROLES.ADMIN || role === ROLES.ATTENDANT;
}

const RADIUS = 118;

function arcPositions(count) {
  if (!count) return [];
  const startDeg = -158;
  const endDeg = -22;
  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const deg = startDeg + (endDeg - startDeg) * t;
    const rad = (deg * Math.PI) / 180;
    return {
      x: Math.cos(rad) * RADIUS,
      y: Math.sin(rad) * RADIUS,
    };
  });
}

function IrisIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" stroke="rgba(255,255,255,0.55)" strokeWidth="1.1" />
      <circle cx="12" cy="12" r="3.1" stroke="rgba(255,255,255,0.9)" strokeWidth="1.1" />
      <line x1="12" y1="2.5" x2="12" y2="8.9" stroke="rgba(255,255,255,0.4)" strokeWidth="1.1" />
      <line x1="12" y1="15.1" x2="12" y2="21.5" stroke="rgba(255,255,255,0.4)" strokeWidth="1.1" />
      <line x1="2.5" y1="12" x2="8.9" y2="12" stroke="rgba(255,255,255,0.4)" strokeWidth="1.1" />
      <line x1="15.1" y1="12" x2="21.5" y2="12" stroke="rgba(255,255,255,0.4)" strokeWidth="1.1" />
      <line x1="5.3" y1="5.3" x2="9.9" y2="9.9" stroke="rgba(255,255,255,0.22)" strokeWidth="1.1" />
      <line x1="14.1" y1="14.1" x2="18.7" y2="18.7" stroke="rgba(255,255,255,0.22)" strokeWidth="1.1" />
      <line x1="18.7" y1="5.3" x2="14.1" y2="9.9" stroke="rgba(255,255,255,0.22)" strokeWidth="1.1" />
      <line x1="9.9" y1="14.1" x2="5.3" y2="18.7" stroke="rgba(255,255,255,0.22)" strokeWidth="1.1" />
    </svg>
  );
}

function DiskNavButton({ item, active }) {
  const Icon = item.icon;
  return (
    <div className="flex flex-col items-center gap-1 w-[4.5rem]">
      <div className={cn(
        'w-11 h-11 rounded-full flex items-center justify-center',
        'border backdrop-blur-2xl transition-colors duration-150',
        active
          ? 'bg-amber-500/25 border-amber-400/75 shadow-[0_0_16px_rgba(245,158,11,0.4)]'
          : 'bg-zinc-900/80 border-white/10 hover:bg-white/10 hover:border-white/22',
      )}>
        <Icon className={cn('w-4 h-4', active ? 'text-amber-400' : 'text-white/72')} />
      </div>
      <span className={cn(
        'text-[9px] font-semibold tracking-wide text-center leading-tight',
        'px-1 py-0.5 rounded bg-zinc-950/80 backdrop-blur-sm max-w-[4.5rem] truncate',
        active ? 'text-amber-400' : 'text-white/62',
      )}>
        {item.label}
      </span>
    </div>
  );
}

function AdminDiskPanel({ items, pathname, searchTab, onClose }) {
  const grouped = useMemo(() => {
    const map = new Map();
    items.forEach((item) => {
      const g = item.group || 'Menu';
      if (!map.has(g)) map.set(g, []);
      map.get(g).push(item);
    });
    return Array.from(map.entries());
  }, [items]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      className={cn(
        'fixed z-50 left-1/2 -translate-x-1/2',
        'bottom-24 w-[min(100%-1.5rem,32rem)]',
        'max-h-[min(58vh,520px)] overflow-y-auto',
        'rounded-2xl border border-white/10',
        'bg-zinc-950/95 backdrop-blur-2xl shadow-[0_-8px_48px_rgba(0,0,0,0.55)]',
        'px-3 pt-3 pb-4',
      )}
      style={{ scrollbarWidth: 'thin' }}
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-400/80 text-center mb-3">
        Menu administrativo
      </p>

      {grouped.map(([groupLabel, groupItems]) => (
        <div key={groupLabel} className="mb-3 last:mb-0">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-500 mb-2 px-1">
            {groupLabel}
          </p>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
            {groupItems.map((item) => {
              const active = isAdminNavItemActive(item, pathname, searchTab);
              return (
                <Link
                  key={item.key}
                  to={item.to}
                  onClick={onClose}
                  className="flex justify-center"
                >
                  <DiskNavButton item={item} active={active} />
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </motion.div>
  );
}

export default function RadialMenu() {
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [open, setOpen] = useState(false);

  const isStaff = isStaffRole(user?.role);
  const staffRole = user?.role === ROLES.ATTENDANT ? 'attendant' : 'admin';
  const standardItems = getStandardNavItems(user);
  const adminItems = isStaff ? getAdminDiskNavItems(staffRole) : [];
  const arcItems = isStaff ? adminItems : standardItems;
  const positions = arcPositions(arcItems.length);
  const searchTab = searchParams.get('tab');

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search]);

  const close = useCallback(() => setOpen(false), []);

  const isItemActive = (item) => {
    if (isStaff) {
      return isAdminNavItemActive(item, location.pathname, searchTab);
    }
    return location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="rm-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={close}
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px]"
          />
        )}
      </AnimatePresence>

      {/* Admin/atendente: painel com todos os itens do sidebar */}
      <AnimatePresence>
        {open && isStaff && (
          <AdminDiskPanel
            items={adminItems}
            pathname={location.pathname}
            searchTab={searchTab}
            onClose={close}
          />
        )}
      </AnimatePresence>

      {/* Cliente/prestador/parceiro: arco clássico */}
      <AnimatePresence>
        {open && !isStaff && arcItems.map((item, i) => {
          const pos = positions[i];
          const active = isItemActive(item);

          return (
            <motion.div
              key={item.key}
              className="fixed z-50 pointer-events-auto"
              style={{ bottom: '28px', left: '50%', marginLeft: '-24px' }}
              initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
              animate={{ x: pos.x, y: pos.y, scale: 1, opacity: 1 }}
              exit={{ x: 0, y: 0, scale: 0, opacity: 0 }}
              transition={{
                type: 'spring',
                stiffness: 420,
                damping: 30,
                delay: i * 0.042,
              }}
            >
              <Link to={item.to} onClick={close}>
                <div className="flex flex-col items-center gap-1 w-12">
                  <div className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center',
                    'border backdrop-blur-2xl transition-colors duration-150',
                    active
                      ? 'bg-amber-500/25 border-amber-400/75 shadow-[0_0_20px_rgba(245,158,11,0.45)]'
                      : 'bg-zinc-900/72 border-white/10 hover:bg-white/10 hover:border-white/22',
                  )}>
                    <item.icon className={cn(
                      'w-5 h-5 transition-colors',
                      active ? 'text-amber-400' : 'text-white/72',
                    )} />
                  </div>
                  <span className={cn(
                    'text-[10px] font-semibold tracking-wide whitespace-nowrap',
                    'px-1.5 py-0.5 rounded bg-zinc-950/80 backdrop-blur-sm',
                    active ? 'text-amber-400' : 'text-white/62',
                  )}>
                    {item.label}
                  </span>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setOpen((p) => !p)}
        whileTap={{ scale: 0.87 }}
        aria-label={open ? 'Fechar menu' : 'Abrir menu'}
        aria-expanded={open}
        className={cn(
          'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
          'w-14 h-14 rounded-full border',
          'backdrop-blur-2xl transition-all duration-300',
          open
            ? 'bg-amber-500/22 border-amber-400/85 shadow-[0_0_36px_rgba(245,158,11,0.6)]'
            : 'bg-zinc-900/78 border-white/10 shadow-[0_8px_42px_rgba(0,0,0,0.65)]',
        )}
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span
              key="close-icon"
              initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.16 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <X className="w-5 h-5 text-amber-400" />
            </motion.span>
          ) : (
            <motion.span
              key="iris-icon"
              initial={{ rotate: 90, opacity: 0, scale: 0.6 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: -90, opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.16 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <IrisIcon />
            </motion.span>
          )}
        </AnimatePresence>

        {!open && (
          <span
            className="absolute inset-0 rounded-full animate-ping bg-amber-500/10 pointer-events-none"
            style={{ animationDuration: '2.8s' }}
          />
        )}
      </motion.button>
    </>
  );
}
