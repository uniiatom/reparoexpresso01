import React from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getProviderNavItems,
  isProviderNavItemActive,
} from '@/lib/navigation/providerNavigation';

const W_OPEN = 236;
const W_CLOSED = 56;

export default function ProviderSidebar({ open, onToggle }) {
  const location = useLocation();
  const items = getProviderNavItems();

  return (
    <motion.aside
      initial={false}
      animate={{ width: open ? W_OPEN : W_CLOSED }}
      transition={{ type: 'spring', stiffness: 340, damping: 32 }}
      onClick={onToggle}
      aria-label="Menu do prestador"
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
      <div className="h-11 flex items-center flex-shrink-0 border-b border-white/[0.05] px-3.5 gap-3">
        <div className="w-[22px] h-[22px] rounded-md bg-amber-500/15 border border-amber-500/25 flex items-center justify-center flex-shrink-0">
          <Wrench className="w-3 h-3 text-amber-400" />
        </div>
        <motion.span
          animate={{ opacity: open ? 1 : 0, x: open ? 0 : -6 }}
          transition={{ duration: 0.16, delay: open ? 0.07 : 0 }}
          className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-400/90 whitespace-nowrap"
        >
          Área Prestador
        </motion.span>
      </div>

      <div
        className="flex-1 overflow-y-auto overflow-x-hidden py-1.5"
        style={{ scrollbarWidth: 'none' }}
      >
        {items.map((item) => {
          const isActive = isProviderNavItemActive(item, location.pathname);
          const Icon = item.icon;

          return (
            <Link
              key={item.key}
              to={item.to}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                'relative flex items-center gap-3',
                'px-[17px] py-[8px] transition-all duration-100',
                'hover:bg-white/[0.04]',
                isActive && 'bg-amber-500/[0.08]',
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1 bottom-1 w-[2px] bg-amber-400/70 rounded-r-full" />
              )}
              <div className="flex-shrink-0 w-[22px] flex items-center justify-center">
                <Icon className={cn(
                  'w-[15px] h-[15px] transition-colors duration-100',
                  isActive ? 'text-amber-400' : 'text-zinc-400',
                )} />
              </div>
              <motion.span
                animate={{ opacity: open ? 1 : 0 }}
                transition={{ duration: 0.12, delay: open ? 0.08 : 0 }}
                className={cn(
                  'text-[12px] font-semibold whitespace-nowrap',
                  isActive ? 'text-amber-400' : 'text-zinc-300',
                )}
              >
                {item.label}
              </motion.span>
            </Link>
          );
        })}
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
