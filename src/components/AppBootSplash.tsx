import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, ShieldCheck, Cpu, Wifi } from 'lucide-react';

interface AppBootSplashProps {
  onBootComplete: () => void;
  esp32Connected?: boolean;
}

const BOOT_STEPS = [
  { label: 'Initialisation du processeur de télémétrie…', icon: Cpu, progress: 28 },
  { label: 'Vérification des canaux de protection & relais…', icon: ShieldCheck, progress: 64 },
  { label: 'Synchronisation des flux réseau & ESP32…', icon: Wifi, progress: 92 },
  { label: 'Système Smart Énergie Monitor prêt !', icon: Zap, progress: 100 },
];

export const AppBootSplash: React.FC<AppBootSplashProps> = ({ onBootComplete }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(15);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    // Step 1 -> 2
    const t1 = setTimeout(() => {
      setCurrentStepIndex(1);
      setProgress(58);
    }, 280);

    // Step 2 -> 3
    const t2 = setTimeout(() => {
      setCurrentStepIndex(2);
      setProgress(88);
    }, 620);

    // Step 3 -> 4
    const t3 = setTimeout(() => {
      setCurrentStepIndex(3);
      setProgress(100);
    }, 950);

    // Complete boot & trigger fade out
    const t4 = setTimeout(() => {
      setIsFinished(true);
      setTimeout(() => {
        onBootComplete();
      }, 350);
    }, 1250);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onBootComplete]);

  const CurrentIcon = BOOT_STEPS[currentStepIndex].icon;

  return (
    <AnimatePresence>
      {!isFinished && (
        <motion.div
          key="boot-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[9999] bg-[#050814] flex flex-col items-center justify-center p-4 overflow-hidden select-none"
        >
          {/* Radial ambient cyber glows */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] bg-cyan-500/10 rounded-full blur-[90px] pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[220px] bg-violet-600/15 rounded-full blur-[70px] pointer-events-none" />

          {/* Grid background effect */}
          <div 
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: 'linear-gradient(#00f2fe 1px, transparent 1px), linear-gradient(90deg, #00f2fe 1px, transparent 1px)',
              backgroundSize: '24px 24px'
            }}
          />

          <div className="relative z-10 flex flex-col items-center max-w-sm w-full">
            {/* Animated Logo Shield & Energy Core */}
            <div className="relative w-28 h-28 flex items-center justify-center mb-7">
              {/* Outer rotating HUD ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 rounded-full border border-dashed border-cyan-500/40"
              />

              {/* Counter-rotating accent ring */}
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-2 rounded-full border-t-2 border-r border-cyan-400/80 border-b-transparent border-l-transparent shadow-[0_0_15px_rgba(6,182,212,0.4)]"
              />

              {/* Pulsing energy sphere backdrop */}
              <motion.div
                animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-4 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-blue-900/30 to-violet-900/30 border border-cyan-400/30 backdrop-blur-md flex items-center justify-center shadow-[inset_0_0_20px_rgba(6,182,212,0.3)]"
              />

              {/* Central Glowing Lightning Bolt Icon */}
              <motion.div
                animate={{ scale: [0.95, 1.05, 0.95] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                className="relative z-10 w-14 h-14 rounded-xl bg-gradient-to-tr from-cyan-400 to-amber-300 flex items-center justify-center shadow-[0_0_25px_rgba(6,182,212,0.8),0_0_10px_rgba(251,191,36,0.6)]"
              >
                <Zap className="w-8 h-8 text-slate-950 fill-slate-950 transform -rotate-6" />
              </motion.div>
            </div>

            {/* Brand Title */}
            <motion.div
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="text-center mb-6"
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse" />
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-cyan-100 font-['Chakra_Petch',sans-serif]">
                  SMART ÉNERGIE MONITOR
                </h1>
              </div>
              <p className="text-[11px] sm:text-xs font-mono uppercase tracking-widest text-cyan-400/70">
                Surveillance & Protection Temps Réel
              </p>
            </motion.div>

            {/* Progress Container */}
            <div className="w-full max-w-[280px] bg-slate-900/90 border border-slate-800/80 rounded-2xl p-3.5 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
              {/* Progress Bar Header with Percentage */}
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className="text-slate-400 text-[11px] flex items-center gap-1.5 font-medium">
                  <CurrentIcon className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                  INITIALISATION
                </span>
                <span className="text-cyan-300 font-bold text-[12px]">{progress}%</span>
              </div>

              {/* Progress Track */}
              <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden p-[1px] border border-white/5 relative">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 via-sky-400 to-emerald-400 rounded-full shadow-[0_0_12px_rgba(6,182,212,0.8)]"
                  initial={{ width: '10%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              </div>

              {/* Dynamic Status Text */}
              <div className="mt-2.5 min-h-[16px] flex items-center justify-center">
                <motion.p
                  key={currentStepIndex}
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -3 }}
                  transition={{ duration: 0.2 }}
                  className="text-[10.5px] font-mono text-slate-300 text-center truncate"
                >
                  {BOOT_STEPS[currentStepIndex].label}
                </motion.p>
              </div>
            </div>

            {/* Micro Hardware Tagline */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-6 flex items-center gap-2 text-[10px] font-mono text-slate-500 tracking-wider"
            >
              <span>ESP32 PZEM CORE</span>
              <span>•</span>
              <span>RELAY PROTECTION</span>
              <span>•</span>
              <span>230V 50Hz</span>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
