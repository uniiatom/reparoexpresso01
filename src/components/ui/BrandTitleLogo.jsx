import { cn } from '@/lib/utils';
import { LOGO_TITLE_SRC } from '@/lib/brandAssets';

const VARIANTS = {
  /** Página principal / login — mesmo peso visual do título hero */
  hero: cn(
    'h-auto w-[min(94vw,28rem)]',
    'sm:w-[min(90vw,32rem)]',
    'lg:w-[min(36rem,92%)]',
    'drop-shadow-[0_4px_28px_rgba(245,158,11,0.55)]',
  ),
  compact: 'h-14 w-auto drop-shadow-[0_2px_16px_rgba(245,158,11,0.5)]',
};

export default function BrandTitleLogo({
  variant = 'hero',
  className,
  glowClassName,
  alt = 'Reparo Expresso',
  ...props
}) {
  return (
    <div className={cn('relative inline-flex', className)} {...props}>
      <span
        className={cn(
          'absolute inset-0 rounded-2xl bg-amber-500/20 blur-2xl scale-125 pointer-events-none',
          glowClassName,
        )}
        aria-hidden
      />
      <img
        src={LOGO_TITLE_SRC}
        alt={alt}
        className={cn('relative object-contain', VARIANTS[variant] ?? VARIANTS.hero)}
      />
    </div>
  );
}
