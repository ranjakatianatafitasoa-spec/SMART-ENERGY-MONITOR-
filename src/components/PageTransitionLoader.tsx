import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ActiveTab } from '../types';

interface PageTransitionLoaderProps {
  activeTab: ActiveTab;
}

export const PageTransitionLoader: React.FC<PageTransitionLoaderProps> = ({ activeTab }) => {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 280);

    return () => clearTimeout(timer);
  }, [activeTab]);

  if (!isLoading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9990] h-[2.5px] pointer-events-none overflow-hidden bg-slate-900/30">
      <motion.div
        initial={{ x: '-100%', opacity: 1 }}
        animate={{ x: '100%', opacity: 0.9 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="w-1/2 h-full bg-gradient-to-r from-transparent via-cyan-400 to-amber-300 shadow-[0_0_12px_#06b6d4,0_0_6px_#fbbf24]"
      />
    </div>
  );
};
