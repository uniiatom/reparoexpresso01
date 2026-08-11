import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { LOGO_TITLE_SRC } from '@/lib/brandAssets';

export default function AppLoadingScreen({
  className,
  fullScreen = true,
  showSpinner = true,
  logoClassName,
}) {
  return (
    <motion.div
      className={cn(
        'flex flex-col items-center justify-center bg-zinc-950',
        fullScreen && 'fixed inset-0 z-50',
        !fullScreen && 'min-h-[40vh] w-full py-16',
        className,
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex flex-col items-center gap-10 px-6">
        <div className="relative">
          <span
            className="absolute inset-0 rounded-3xl bg-amber-500/15 blur-3xl scale-110 pointer-events-none"
            aria-hidden
          />
          <img
            src={LOGO_TITLE_SRC}
            alt="Reparo Expresso"
            className={cn(
              'relative w-[min(88vw,440px)] h-auto object-contain',
              'drop-shadow-[0_4px_32px_rgba(245,158,11,0.35)]',
              logoClassName,
            )}
          />
        </div>

        {showSpinner && (
          <div
            className="h-10 w-10 border-2 border-zinc-700 border-t-amber-400 rounded-full animate-spin"
            role="status"
            aria-label="Carregando"
          />
        )}
      </div>
    </motion.div>
  );
}
