import React from 'react';
import { Zap, Activity, Gauge, TrendingUp, Maximize2 } from 'lucide-react';
import { ESP32Data } from '../types';

interface MetricsGridProps {
  data: ESP32Data;
  onOpenEnergyModal: () => void;
}

export const MetricsGrid: React.FC<MetricsGridProps> = ({ data, onOpenEnergyModal }) => {
  const tensionStr = data.tension.toFixed(1);
  const courantStr = data.courant.toFixed(2);
  const puissanceStr = data.puissance.toFixed(0);
  const energieKWh = (data.energie / 1000).toFixed(3);

  // Computed smart indicators
  const vPercentage = Math.min(100, Math.max(0, (data.tension / 260) * 100));
  const iPercentage = Math.min(100, Math.max(0, (data.courant / 10) * 100)); // Max 10A scale
  const pPercentage = Math.min(100, Math.max(0, (data.puissance / 2300) * 100)); // Max 2300W scale

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
      {/* 1. Tension Card */}
      <div className="glass-panel p-3 sm:p-4 rounded-2xl relative overflow-hidden group hover:border-cyan-500/40 text-center border border-slate-800/90 bg-slate-950/90 shadow-xl flex flex-col justify-between min-h-[14vh] sm:min-h-[18vh]">
        <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all pointer-events-none" />

        <div className="flex items-center justify-center gap-1.5">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Zap className="w-4 h-4" />
          </div>
          <span className="text-[11px] sm:text-xs font-mono font-bold tracking-wider text-slate-300 uppercase">
            TENSION SECTEUR
          </span>
        </div>

        <div className="my-auto py-2 flex items-baseline justify-center gap-1.5 font-mono">
          <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-cyan-300 tracking-tight drop-shadow-[0_0_12px_rgba(0,242,254,0.4)]">
            {tensionStr}
          </span>
          <span className="text-sm sm:text-base font-bold text-slate-400">V</span>
        </div>

        {/* Progress Bar & Subtitle */}
        <div className="space-y-1">
          <div className="flex items-center justify-between font-mono text-[9px] text-slate-400 px-0.5">
            <span>0 V</span>
            <span className="text-cyan-400 font-bold">230 V Nom.</span>
            <span>260 V</span>
          </div>
          <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${vPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Courant Card */}
      <div className="glass-panel p-3 sm:p-4 rounded-2xl relative overflow-hidden group hover:border-amber-500/40 text-center border border-slate-800/90 bg-slate-950/90 shadow-xl flex flex-col justify-between min-h-[14vh] sm:min-h-[18vh]">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all pointer-events-none" />

        <div className="flex items-center justify-center gap-1.5">
          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Activity className="w-4 h-4" />
          </div>
          <span className="text-[11px] sm:text-xs font-mono font-bold tracking-wider text-slate-300 uppercase">
            INTENSITÉ CHARGE
          </span>
        </div>

        <div className="my-auto py-2 flex items-baseline justify-center gap-1.5 font-mono">
          <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-amber-300 tracking-tight drop-shadow-[0_0_12px_rgba(245,158,11,0.4)]">
            {courantStr}
          </span>
          <span className="text-sm sm:text-base font-bold text-slate-400">A</span>
        </div>

        {/* Progress Bar & Subtitle */}
        <div className="space-y-1">
          <div className="flex items-center justify-between font-mono text-[9px] text-slate-400 px-0.5">
            <span>0 A</span>
            <span className="text-amber-400 font-bold">Max 10A</span>
          </div>
          <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${iPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. Puissance Card */}
      <div className="glass-panel p-3 sm:p-4 rounded-2xl relative overflow-hidden group hover:border-violet-500/40 text-center border border-slate-800/90 bg-slate-950/90 shadow-xl flex flex-col justify-between min-h-[14vh] sm:min-h-[18vh]">
        <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl group-hover:bg-violet-500/20 transition-all pointer-events-none" />

        <div className="flex items-center justify-center gap-1.5">
          <div className="p-1.5 rounded-lg bg-violet-500/10 border border-violet-500/30 text-violet-400">
            <Gauge className="w-4 h-4" />
          </div>
          <span className="text-[11px] sm:text-xs font-mono font-bold tracking-wider text-slate-300 uppercase">
            PUISSANCE ACTIVE
          </span>
        </div>

        <div className="my-auto py-2 flex items-baseline justify-center gap-1.5 font-mono">
          <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-violet-300 tracking-tight drop-shadow-[0_0_12px_rgba(139,92,246,0.4)]">
            {puissanceStr}
          </span>
          <span className="text-sm sm:text-base font-bold text-slate-400">W</span>
        </div>

        {/* Progress Bar & Subtitle */}
        <div className="space-y-1">
          <div className="flex items-center justify-between font-mono text-[9px] text-slate-400 px-0.5">
            <span>0 W</span>
            <span className="text-violet-400 font-bold">2.3 kW Max</span>
          </div>
          <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${pPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* 4. Énergie Card */}
      <div className="glass-panel p-3 sm:p-4 rounded-2xl relative overflow-hidden group hover:border-emerald-500/40 text-center border border-slate-800/90 bg-slate-950/90 shadow-xl flex flex-col justify-between min-h-[14vh] sm:min-h-[18vh]">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />

        <button
          onClick={onOpenEnergyModal}
          className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 active:scale-90 transition-all cursor-pointer z-10"
          title="Agrandir et analyser la courbe de consommation"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center justify-center gap-1.5 pr-6">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <span className="text-[11px] sm:text-xs font-mono font-bold tracking-wider text-slate-300 uppercase">
            ÉNERGIE CUMULÉE
          </span>
        </div>

        <div className="my-auto py-2 flex items-baseline justify-center gap-1.5 font-mono">
          <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-emerald-300 tracking-tight drop-shadow-[0_0_12px_rgba(16,185,129,0.4)]">
            {energieKWh}
          </span>
          <span className="text-sm sm:text-base font-bold text-slate-400">kWh</span>
        </div>

        {/* Progress Bar & Subtitle */}
        <div className="space-y-1">
          <div className="flex items-center justify-between font-mono text-[9px] text-slate-400 px-0.5">
            <span>Cumulatif</span>
            <span className="text-emerald-400 font-bold">Compteur Actif</span>
          </div>
          <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full animate-pulse w-full" />
          </div>
        </div>
      </div>
    </div>
  );
};
