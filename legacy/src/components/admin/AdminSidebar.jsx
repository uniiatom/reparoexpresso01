import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronDown, LayoutDashboard, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getAdminNavGroups,
  getAdminExternalLinks,
  getAdminMenuIdForTab,
} from '@/lib/navigation/adminNavigation';

const W_OPEN = 236;
const W_CLOSED = 56;

export default function AdminSidebar({
  open,
  onToggle,
  activeTab: activeTabProp,
  onNavigate,
  pendingCount = 0,
  pendingPhotos = 0,
  role = 'admin',
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const activeTab = activeTabProp ?? (
    location.pathname === '/admin'
      ? (searchParams.get('tab') || 'analytics')
      : ''
  );

  const visibleGroups = getAdminNavGroups(role);
  const externalLinks = getAdminExternalLinks(role);

  const [expandedGroups, setExpandedGroups] = useState(() => new Set());

  useEffect(() => {
    const menuId = getAdminMenuIdForTab(activeTab, role);
    if (menuId) {
      setExpandedGroups(new Set([menuId]));
    }
  }, [activeTab, role]);

  useEffect(() => {
    if (!open) setExpandedGroups(new Set());
  }, [open]);

  const handleNavigate = (tab) => {
    if (onNavigate) {
      onNavigate(tab);
      return;
    }
    navigate(`/admin?tab=${tab}`);
  };

  const toggleGroup = (groupId, e) => {
    e.stopPropagation();

    if (!open) {
      onToggle?.();
      setExpandedGroups(new Set([groupId]));
      return;
    }

    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const badge = (item) =>
    item.badge === 'pending' ? pendingCount :
    item.badge === 'pendingPhotos' ? pendingPhotos : 0;

  const groupBadgeCount = (group) =>
    group.items.reduce((sum, item) => sum + badge(item), 0);

  return (
    <motion.aside
      initial={false}
      animate={{ width: open ? W_OPEN : W_CLOSED }}
      transition={{ type: 'spring', stiffness: 340, damping: 32 }}
      onClick={onToggle}
      aria-label="Menu administrativo"
      aria-expanded={open}
      className={cn(
        'fixed left-0 z-[48] cursor-pointer select-none',
        'flex flex-col',
        'bg-zinc-950/98 backdrop-blur-2xl',
        'border-r border-white/[0.06]',
        'overflow-hidden',
      )}
      style={{
        top: '56px',
        height: 'calc(100vh - 56px)',
        minWidth: W_CLOSED,
        maxWidth: W_OPEN,
      }}
    >
      <motion.div className="h-11 flex items-center flex-shrink-0 border-b border-white/[0.05] px-3.5 gap-3">
        <div className="w-[22px] h-[22px] rounded-md bg-amber-500/15 border border-amber-500/25 flex items-center justify-center flex-shrink-0">
          <LayoutDashboard className="w-3 h-3 text-amber-400" />
        </div>
        <motion.span
          animate={{ opacity: open ? 1 : 0, x: open ? 0 : -6 }}
          transition={{ duration: 0.16, delay: open ? 0.07 : 0 }}
          className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-400/90 whitespace-nowrap"
        >
          {role === 'attendant' ? 'Central Suporte' : 'Admin Panel'}
        </motion.span>
      </motion.div>

      <div
        className="flex-1 overflow-y-auto overflow-x-hidden py-1.5"
        style={{ scrollbarWidth: 'none' }}
      >
        {visibleGroups.map((group) => {
          const isExpanded = expandedGroups.has(group.id);
          const hasActiveChild = group.items.some((item) => item.value === activeTab);
          const GroupIcon = group.icon;
          const groupCount = groupBadgeCount(group);

          return (
            <div key={group.id} className="mb-0.5">
              <button
                type="button"
                onClick={(e) => toggleGroup(group.id, e)}
                className={cn(
                  'relative w-full flex items-center gap-3',
                  'px-[17px] py-[8px] transition-all duration-100',
                  'hover:bg-white/[0.04]',
                  hasActiveChild && 'bg-amber-500/[0.05]',
                )}
              >
                {hasActiveChild && (
                  <span className="absolute left-0 top-1 bottom-1 w-[2px] bg-amber-400/70 rounded-r-full" />
                )}
                <motion.div className="relative flex-shrink-0 w-[22px] flex items-center justify-center">
                  <GroupIcon className={cn(
                    'w-[15px] h-[15px] transition-colors duration-100',
                    hasActiveChild ? 'text-amber-400' : 'text-zinc-400',
                  )} />
                  {groupCount > 0 && !open && (
                    <span className="absolute -top-[3px] -right-[3px] w-[7px] h-[7px] bg-red-500 rounded-full border border-zinc-950" />
                  )}
                </motion.div>
                <motion.span
                  animate={{ opacity: open ? 1 : 0 }}
                  transition={{ duration: 0.12, delay: open ? 0.08 : 0 }}
                  className={cn(
                    'flex-1 text-left text-[12px] font-semibold whitespace-nowrap',
                    hasActiveChild ? 'text-amber-400' : 'text-zinc-300',
                  )}
                >
                  {group.label}
                </motion.span>
                {open && (
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.16 }}
                    className="flex-shrink-0 text-zinc-600"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </motion.div>
                )}
                {groupCount > 0 && open && (
                  <span className="flex-shrink-0 text-[10px] font-bold bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded-full">
                    {groupCount}
                  </span>
                )}
              </button>

              <AnimatePresence initial={false}>
                {open && isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden border-l border-white/[0.05] ml-[26px] mr-2"
                  >
                    {group.items.map((item) => {
                      const isActive = activeTab === item.value;
                      const cnt = badge(item);
                      const Icon = item.icon;

                      return (
                        <button
                          key={item.value}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleNavigate(item.value); }}
                          className={cn(
                            'relative w-full flex items-center gap-2.5',
                            'pl-3 pr-3 py-[6px] transition-all duration-100',
                            'hover:bg-white/[0.04]',
                            isActive && 'bg-amber-500/[0.08]',
                          )}
                        >
                          {isActive && (
                            <span className="absolute left-0 top-1 bottom-1 w-[2px] bg-amber-400 rounded-r-full" />
                          )}
                          <div className="relative flex-shrink-0 w-[18px] flex items-center justify-center">
                            <Icon className={cn(
                              'w-[13px] h-[13px] transition-colors duration-100',
                              isActive ? 'text-amber-400' : 'text-zinc-500',
                            )} />
                            {cnt > 0 && (
                              <span className="absolute -top-[3px] -right-[3px] w-[7px] h-[7px] bg-red-500 rounded-full border border-zinc-950" />
                            )}
                          </div>
                          <span className={cn(
                            'flex-1 text-left text-[11px] font-medium whitespace-nowrap',
                            isActive ? 'text-amber-400' : 'text-zinc-400',
                          )}>
                            {item.label}
                          </span>
                          {cnt > 0 && (
                            <span className="flex-shrink-0 text-[10px] font-bold bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded-full">
                              {cnt}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        <div className="border-t border-white/[0.05] mt-2 pt-2">
          <motion.p
            animate={{ opacity: open ? 1 : 0, height: open ? 'auto' : 0 }}
            className="overflow-hidden px-4 pb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-600 whitespace-nowrap"
          >
            Atalhos
          </motion.p>
          {externalLinks.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname === to;
            return (
              <Link key={to} to={to} onClick={(e) => e.stopPropagation()}>
                <div
                  className={cn(
                    'flex items-center gap-3 px-[17px] py-[7px] hover:bg-white/[0.04] transition-colors',
                    isActive && 'bg-amber-500/[0.07]',
                  )}
                >
                  <motion.div className="w-[22px] flex items-center justify-center flex-shrink-0">
                    <Icon className={cn('w-[15px] h-[15px]', isActive ? 'text-amber-400' : 'text-zinc-600')} />
                  </motion.div>
                  <motion.span
                    animate={{ opacity: open ? 1 : 0 }}
                    transition={{ duration: 0.12, delay: open ? 0.08 : 0 }}
                    className={cn(
                      'text-[12px] font-medium whitespace-nowrap',
                      isActive ? 'text-amber-400' : 'text-zinc-500',
                    )}
                  >
                    {label}
                  </motion.span>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="border-t border-white/[0.05] mt-2 pt-2">
          <motion.p
            animate={{ opacity: open ? 1 : 0, height: open ? 'auto' : 0 }}
            className="overflow-hidden px-4 pb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-600 whitespace-nowrap"
          >
            Conta
          </motion.p>
          <Link to="/perfil" onClick={(e) => e.stopPropagation()}>
            <div
              className={cn(
                'flex items-center gap-3 px-[17px] py-[7px] hover:bg-white/[0.04] transition-colors',
                location.pathname === '/perfil' && 'bg-amber-500/[0.07]',
              )}
            >
              <motion.div className="w-[22px] flex items-center justify-center flex-shrink-0">
                <User className={cn('w-[15px] h-[15px]', location.pathname === '/perfil' ? 'text-amber-400' : 'text-zinc-600')} />
              </motion.div>
              <motion.span
                animate={{ opacity: open ? 1 : 0 }}
                transition={{ duration: 0.12, delay: open ? 0.08 : 0 }}
                className={cn(
                  'text-[12px] font-medium whitespace-nowrap',
                  location.pathname === '/perfil' ? 'text-amber-400' : 'text-zinc-500',
                )}
              >
                Perfil
              </motion.span>
            </div>
          </Link>
        </div>
      </div>

      <div className="h-10 flex items-center justify-center flex-shrink-0 border-t border-white/[0.05]">
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="text-zinc-700"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </motion.div>
      </div>
    </motion.aside>
  );
}
