import React from 'react';
import { motion } from 'framer-motion';
import { Clock, ImageIcon, Pencil, Trash2, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDuration, formatPrice, getOfferedServiceIcon } from '@/lib/offeredServices';

export default function OfferedServiceCard({
  service,
  selected = false,
  onClick,
  onEdit,
  onDelete,
  compact = false,
  showDescription = true,
  admin = false,
}) {
  const Icon = typeof service.icon === 'function'
    ? service.icon
    : getOfferedServiceIcon(service.icon_key, Wrench);
  const hasImage = !!service.image_url;
  const isInteractive = !admin && !!onClick;

  const cardClassName = cn(
    'group relative overflow-hidden text-left rounded-2xl border transition-all duration-200',
    'bg-gradient-to-br from-zinc-950/90 via-zinc-900/80 to-zinc-950/95',
    selected
      ? 'border-amber-400/70 shadow-[0_0_28px_rgba(245,158,11,0.22)] ring-1 ring-amber-400/40'
      : 'border-white/10 hover:border-amber-400/35 hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)]',
    compact ? 'p-3' : 'p-0 min-h-[220px] flex flex-col h-full w-full',
    admin && 'hover:border-amber-400/35',
  );

  const inner = (
    <>
      <div
        className={cn(
          'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none',
          'bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.14),transparent_55%)]',
        )}
      />

      {admin && service.is_active === false && (
        <Badge className="absolute top-3 left-3 z-20 bg-zinc-800/95 text-zinc-300 border border-white/10 shadow-sm">
          Inativo
        </Badge>
      )}

      {admin && (onEdit || onDelete) && (
        <motion.div className="absolute top-3 right-3 z-20 flex items-center gap-1">
          {onEdit && (
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="h-8 w-8 rounded-full bg-zinc-900/90 border border-white/15 shadow-md backdrop-blur-sm hover:bg-zinc-800"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              aria-label="Editar serviço"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          )}
          {onDelete && (
            <Button
              type="button"
              size="icon"
              variant="destructive"
              className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              aria-label="Excluir serviço"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </motion.div>
      )}

      <div className={cn('relative', compact ? 'flex items-center gap-3' : 'flex-1 flex flex-col min-h-0')}>
        <div
          className={cn(
            'relative overflow-hidden',
            compact ? 'w-14 h-14 rounded-xl shrink-0' : 'h-28 w-full rounded-t-2xl',
          )}
        >
          {hasImage ? (
            <img
              src={service.image_url}
              alt={service.name || service.label}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-900/80">
              <Icon className="w-8 h-8 text-amber-400/75" />
            </div>
          )}
          {!hasImage && !compact && (
            <div className="absolute inset-0 flex items-center justify-center text-zinc-600">
              <ImageIcon className="w-5 h-5" />
            </div>
          )}
        </div>

        <div className={cn('relative z-[1]', compact ? 'flex-1 min-w-0' : 'p-4 pt-3 flex-1 flex flex-col min-h-0')}>
          <p
            className={cn(
              'font-semibold text-foreground leading-tight',
              compact ? 'text-sm truncate' : 'text-base',
              admin && 'pr-10',
            )}
          >
            {service.name || service.label}
          </p>

          {showDescription && service.description && !compact && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{service.description}</p>
          )}

          <div
            className={cn(
              'flex flex-wrap items-center gap-2 mt-auto',
              compact ? 'mt-1' : 'mt-3 pt-2',
            )}
          >
            <span className="text-[11px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
              {formatPrice(service.average_price)}
            </span>
            <span className="text-[11px] text-zinc-400 inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDuration(service.estimated_duration_minutes)}
            </span>
          </div>

          {admin && service.slug && (
            <p className="mt-2 pt-2 border-t border-white/5 text-[10px] text-zinc-500 font-mono truncate">
              {service.slug}
            </p>
          )}
        </div>
      </div>
    </>
  );

  if (isInteractive) {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        whileHover={{ y: -3 }}
        whileTap={{ scale: 0.98 }}
        className={cardClassName}
      >
        {inner}
      </motion.button>
    );
  }

  return (
    <motion.div whileHover={admin ? { y: -2 } : undefined} className={cardClassName}>
      {inner}
    </motion.div>
  );
}
