import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { LOGO_TITLE_SRC } from '@/lib/brandAssets';

export default function BrandSplashScreen({ duration = 2000, onComplete }) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      onComplete?.();
    }, duration);
    return () => window.clearTimeout(timer);
  }, [duration, onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <motion.div
        className="relative px-6"
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <span
          className="absolute inset-0 rounded-3xl bg-amber-500/20 blur-3xl scale-125 pointer-events-none"
          aria-hidden
        />
        <img
          src={LOGO_TITLE_SRC}
          alt="Reparo Expresso"
          className="relative w-[min(92vw,480px)] h-auto object-contain drop-shadow-[0_6px_40px_rgba(245,158,11,0.4)]"
        />
      </motion.div>
    </motion.div>
  );
}
