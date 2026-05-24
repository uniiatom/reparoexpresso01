import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import {
  Home, Zap, ClipboardList, User, Gift, Wallet,
  Wrench, DollarSign, Calendar, BarChart3,
  LayoutDashboard, X, ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROLES } from '@/lib/auth/roles';
import {
  getAdminDiskNavStructure,
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

const FAB_BOTTOM = 24;
const FAB_SIZE = 56;
const FAB_CENTER_BOTTOM = FAB_BOTTOM + FAB_SIZE / 2;

/** Sobe o arco só o necessário para não invadir o rodapé. */
const MENU_VERTICAL_LIFT = 22;

/** Espaço mínimo entre centros de cada item no arco (inclui área do rótulo abaixo). */
const ITEM_SLOT = {
  standard: { width: 92, height: 72, ringStep: 86, baseRadius: 100, iconHalf: 24 },
  compact: { width: 76, height: 68, ringStep: 82, baseRadius: 88, iconHalf: 22 },
};

/** Distribui itens em arco acima do botão (sem descer para o rodapé). */
function distributeOnRing(countOnRing, radius, ringIndex = 0) {
  const arcPadding = 0.14;
  const arcStart = -Math.PI + arcPadding;
  const arcEnd = -arcPadding;
  const stagger = ringIndex % 2 === 1 ? (Math.PI / countOnRing) * 0.28 : 0;

  return Array.from({ length: countOnRing }, (_, i) => {
    const t = countOnRing === 1 ? 0.5 : i / (countOnRing - 1);
    const angle = arcStart + stagger + t * (arcEnd - arcStart - stagger * 2);
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius - MENU_VERTICAL_LIFT,
      angle,
    };
  });
}

/** Anéis concêntricos em volta do botão central — quanto mais itens, maior o disco. */
function getMenuLayout(count, compact = false) {
  if (!count) {
    return { positions: [], maxRadius: 0, discSize: 260 };
  }

  const slot = compact ? ITEM_SLOT.compact : ITEM_SLOT.standard;
  const positions = [];

  let placed = 0;
  let ring = 0;

  while (placed < count) {
    const radius = slot.baseRadius + ring * slot.ringStep;
    const arcLength = Math.PI * radius;
    const slotWidth = slot.width * (ring % 2 === 0 ? 1.04 : 0.96);
    const maxOnRing = Math.max(3, Math.floor(arcLength / slotWidth));
    const onRing = Math.min(maxOnRing, count - placed);

    positions.push(...distributeOnRing(onRing, radius, ring));

    placed += onRing;
    ring += 1;
  }

  const maxRadius = slot.baseRadius + Math.max(0, ring - 1) * slot.ringStep;
  const discSize = Math.max(240, maxRadius * 2 + slot.height + 32 + MENU_VERTICAL_LIFT);

  return { positions, maxRadius, discSize };
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

function DiskNavButton({ item, active, compact = false }) {
  const Icon = item.icon;
  const buttonSize = compact ? 'w-11 h-11' : 'w-12 h-12';
  const iconSize = compact ? 'w-4 h-4' : 'w-5 h-5';
  const wrapWidth = compact ? 'w-[4.75rem]' : 'w-16';
  const isMenu = item.type === 'menu';

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
      className={cn('flex flex-col items-center gap-0.5', wrapWidth)}
    >
      <motion.div
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        className={cn(
          buttonSize,
          'rounded-full flex items-center justify-center shrink-0',
          'border backdrop-blur-2xl transition-colors duration-150',
          isMenu
            ? 'bg-amber-500/12 border-amber-400/45 hover:bg-amber-500/20'
            : active
              ? 'bg-amber-500/25 border-amber-400/75 shadow-[0_0_16px_rgba(245,158,11,0.4)]'
              : 'bg-zinc-900/80 border-white/10 hover:bg-white/10 hover:border-white/22',
        )}
      >
        <Icon className={cn(
          iconSize,
          isMenu || active ? 'text-amber-400' : 'text-white/72',
        )} />
      </motion.div>

      <span
        title={item.label}
        className={cn(
          compact ? 'text-[8px] max-w-[4.75rem]' : 'text-[9px] max-w-[4rem]',
          'font-semibold tracking-wide text-center leading-tight',
          'px-1 py-0.5 rounded bg-zinc-950/90 backdrop-blur-sm',
          'line-clamp-2 min-h-[1.5rem]',
          isMenu || active ? 'text-amber-400' : 'text-white/72',
        )}
      >
        {item.label}
      </span>
    </motion.div>
  );
}

function DiskNavAction({ item, active, compact, iconHalf, onMenuOpen, onBack, onClose }) {
  const actionProps = {
    title: item.label,
    'aria-label': item.label,
    className: 'block -translate-x-1/2',
    style: { marginTop: -iconHalf },
  };

  if (item.type === 'menu') {
    return (
      <button
        type="button"
        {...actionProps}
        onClick={() => onMenuOpen(item.id)}
      >
        <DiskNavButton item={item} active={false} compact={compact} />
      </button>
    );
  }

  if (item.type === 'back') {
    return (
      <button
        type="button"
        {...actionProps}
        onClick={onBack}
      >
        <DiskNavButton item={item} active={false} compact={compact} />
      </button>
    );
  }

  return (
    <Link
      to={item.to}
      {...actionProps}
      onClick={onClose}
    >
      <DiskNavButton item={item} active={active} compact={compact} />
    </Link>
  );
}

export default function RadialMenu() {
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [diskMenuId, setDiskMenuId] = useState(null);

  const isStaff = isStaffRole(user?.role);
  const staffRole = user?.role === ROLES.ATTENDANT ? 'attendant' : 'admin';
  const standardItems = getStandardNavItems(user);
  const adminNav = isStaff ? getAdminDiskNavStructure(staffRole) : null;

  const menuItems = useMemo(() => {
    if (!isStaff || !adminNav) return standardItems;

    if (diskMenuId) {
      const currentMenu = adminNav.menus.find((menu) => menu.id === diskMenuId);
      return [
        {
          key: 'back',
          type: 'back',
          label: 'Voltar',
          icon: ChevronLeft,
        },
        ...(currentMenu?.items ?? []),
      ];
    }

    return [
      ...adminNav.menus,
      ...adminNav.shortcuts,
      adminNav.profile,
    ];
  }, [isStaff, adminNav, diskMenuId, standardItems]);

  const compact = isStaff;
  const slot = compact ? ITEM_SLOT.compact : ITEM_SLOT.standard;
  const activeMenuLabel = diskMenuId
    ? adminNav?.menus.find((menu) => menu.id === diskMenuId)?.label
    : null;
  const menuLayout = getMenuLayout(menuItems.length, compact);
  const { positions, discSize } = menuLayout;
  const searchTab = searchParams.get('tab');

  useEffect(() => {
    setOpen(false);
    setDiskMenuId(null);
  }, [location.pathname, location.search]);

  const close = useCallback(() => {
    setOpen(false);
    setDiskMenuId(null);
  }, []);

  const openMenu = useCallback((menuId) => {
    setDiskMenuId(menuId);
  }, []);

  const goBack = useCallback(() => {
    setDiskMenuId(null);
  }, []);

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

      {/* Hub fixo: botão + disco + ícones compartilham o mesmo centro */}
      <motion.div
        className="fixed left-1/2 z-[41] pointer-events-none"
        style={{
          bottom: FAB_CENTER_BOTTOM,
          transform: 'translateX(-50%)',
        }}
      >
        <AnimatePresence>
          {open && (
            <motion.div
              key="rm-disc"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className={cn(
                'absolute rounded-full',
                'border border-white/10 bg-zinc-950/35 backdrop-blur-xl',
                'shadow-[0_0_60px_rgba(245,158,11,0.12)]',
              )}
              style={{
                width: discSize,
                height: discSize,
                left: -discSize / 2,
                top: -(discSize / 2) - MENU_VERTICAL_LIFT * 0.25,
              }}
            />
          )}

          {open && activeMenuLabel && (
            <motion.p
              key="rm-menu-title"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className={cn(
                'absolute left-1/2 -translate-x-1/2 pointer-events-none',
                'text-[10px] font-bold uppercase tracking-[0.16em] text-amber-400/85',
                'px-2 py-0.5 rounded-full bg-zinc-950/80 border border-white/10',
              )}
              style={{ top: -(discSize / 2) - MENU_VERTICAL_LIFT - 14 }}
            >
              {activeMenuLabel}
            </motion.p>
          )}

          {open && menuItems.map((item, i) => {
            const pos = positions[i];
            const active = isItemActive(item);

            return (
              <motion.div
                key={item.key}
                className="absolute left-0 top-0 pointer-events-auto"
                style={{ zIndex: Math.round(120 + pos.y * -1) }}
                initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                animate={{ x: pos.x, y: pos.y, scale: 1, opacity: 1 }}
                exit={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 420,
                  damping: 30,
                  delay: i * 0.035,
                }}
              >
                <DiskNavAction
                  item={item}
                  active={active}
                  compact={compact}
                  iconHalf={slot.iconHalf}
                  onMenuOpen={openMenu}
                  onBack={goBack}
                  onClose={close}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>

        <motion.button
          type="button"
          onClick={() => {
            setOpen((prev) => {
              if (prev) setDiskMenuId(null);
              return !prev;
            });
          }}
          whileTap={{ scale: 0.87 }}
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={open}
          className={cn(
            'absolute z-[52] pointer-events-auto',
            'flex items-center justify-center',
            'w-14 h-14 rounded-full border origin-center',
            'backdrop-blur-2xl transition-colors duration-300',
            open
              ? 'bg-amber-500/22 border-amber-400/85 shadow-[0_0_36px_rgba(245,158,11,0.6)]'
              : 'bg-zinc-900/78 border-white/10 shadow-[0_8px_42px_rgba(0,0,0,0.65)]',
          )}
          style={{
            width: FAB_SIZE,
            height: FAB_SIZE,
            left: -FAB_SIZE / 2,
            top: -FAB_SIZE / 2,
          }}
        >
          <AnimatePresence mode="wait">
            {open ? (
              <motion.span
                key="close-icon"
                initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.16 }}
                className="flex items-center justify-center"
              >
                <X className="w-5 h-5 shrink-0 text-amber-400" strokeWidth={2.25} />
              </motion.span>
            ) : (
              <motion.span
                key="iris-icon"
                initial={{ rotate: 90, opacity: 0, scale: 0.6 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: -90, opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.16 }}
                className="flex items-center justify-center"
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
      </motion.div>
    </>
  );
}
