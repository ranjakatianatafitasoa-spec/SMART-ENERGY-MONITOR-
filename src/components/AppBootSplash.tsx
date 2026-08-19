import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, ShieldCheck, Cpu, Wifi, ArrowRight } from 'lucide-react';

interface AppBootSplashProps {
  onBootComplete: () => void;
  esp32Connected?: boolean;
}

export const AppBootSplash: React.FC<AppBootSplashProps> = ({ onBootComplete, esp32Connected }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(25);
  const [isFinished, setIsFinished] = useState(false);

  const handleFinish = useCallback(() => {
    setIsFinished(true);
    setTimeout(() => {
      onBootComplete();
    }, 280);
  }, [onBootComplete]);

  useEffect(() => {
    // Étape 1 : Initialisation Télémétrie
    const t1 = setTimeout(() => {
      setCurrentStepIndex(1);
      setProgress(55);
    }, 250);

    // Étape 2 : Vérification Protections & Relais
    const t2 = setTimeout(() => {
      setCurrentStepIndex(2);
      setProgress(85);
    }, 550);

    // Étape 3 : Synchronisation Flux & Détection Réseau
    const t3 = setTimeout(() => {
      setCurrentStepIndex(3);
      setProgress(100);
    }, 850);

    // Étape 4 : Basculement Garanti vers le Premier Tableau de Bord
    const t4 = setTimeout(() => {
      handleFinish();
    }, 1150);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [handleFinish]);

  const steps = [
    { label: 'Initialisation du processeur de télémétrie…', icon: Cpu },
    { label: 'Vérification des canaux de sécurité & relais…', icon: ShieldCheck },
    { 
      label: esp32Connected 
        ? 'ESP32 détecté et synchronisé !' 
        : 'Recherche flux ESP32 • Mode écoute actif…', 
      icon: Wifi 
    },
    { 
      label: 'Système Smart Énergie Monitor opérationnel !', 
      icon: Zap 
    },
  ];

  const CurrentIcon = steps[currentStepIndex]?.icon || Zap;

  return (
    <AnimatePresence>
      {!isFinished && (
        <motion.div
          key="boot-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          onClick={handleFinish}
          className="fixed inset-0 z-[9999] bg-[#050814] flex flex-col items-center justify-center p-4 overflow-hidden select-none cursor-pointer"
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
            <div className="relative w-28 h-28 flex items-center justify-center mb-6">
              {/* Outer rotating HUD ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 rounded-full border border-dashed border-cyan-500/40"
              />

              {/* Counter-rotating accent ring */}
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-2 rounded-full border-t-2 border-r border-cyan-400/80 border-b-transparent border-l-transparent shadow-[0_0_15px_rgba(6,182,212,0.4)]"
              />

              {/* Pulsing energy sphere backdrop */}
              <motion.div
                animate={{ scale: [1, 1.06, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-4 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-blue-900/30 to-violet-900/30 border border-cyan-400/30 backdrop-blur-md flex items-center justify-center shadow-[inset_0_0_20px_rgba(6,182,212,0.3)]"
              />

              {/* Central Glowing Lightning Bolt Icon */}
              <motion.div
                animate={{ scale: [0.96, 1.04, 0.96] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                className="relative z-10 w-14 h-14 rounded-xl bg-gradient-to-tr from-cyan-400 to-amber-300 flex items-center justify-center shadow-[0_0_25px_rgba(6,182,212,0.8),0_0_10px_rgba(251,191,36,0.6)]"
              >
                <Zap className="w-8 h-8 text-slate-950 fill-slate-950 transform -rotate-6" />
              </motion.div>
            </div>

            {/* Brand Title */}
            <motion.div
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center mb-5"
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
            <div className="w-full max-w-[290px] bg-slate-900/90 border border-slate-800/80 rounded-2xl p-3.5 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
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
                  initial={{ width: '25%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                />
              </div>

              {/* Dynamic Status Text */}
              <div className="mt-2.5 min-h-[18px] flex items-center justify-center">
                <motion.p
                  key={currentStepIndex}
                  initial={{ opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -2 }}
                  transition={{ duration: 0.18 }}
                  className="text-[11px] font-mono text-slate-300 text-center truncate"
                >
                  {steps[currentStepIndex]?.label}
                </motion.p>
              </div>
            </div>

            {/* Quick Skip / Enter Tip */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-4 flex items-center gap-1.5 text-[10.5px] font-medium text-cyan-400/80 hover:text-cyan-300 transition-colors"
            >
              <span>Accéder à l'interface</span>
              <ArrowRight className="w-3 h-3 animate-pulse" />
            </motion.div>

            {/* Micro Hardware Tagline */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-4 flex items-center gap-2 text-[10px] font-mono text-slate-500 tracking-wider"
            >
              <span>ESP32 PZEM CORE</span>
              <span>•</span>
              <span>PROTECTION RELAIS</span>
              <span>•</span>
              <span>230V 50Hz</span>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
