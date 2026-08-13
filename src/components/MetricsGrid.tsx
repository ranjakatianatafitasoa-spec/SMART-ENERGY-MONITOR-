import React from 'react';
import { Zap, Activity, Gauge, TrendingUp, Maximize2, ShieldAlert, Cpu } from 'lucide-react';
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
    <div className="grid grid-cols-2 gap-3.5 sm:gap-4 mb-5">
      {/* 1. Tension Card */}
      <div className="glass-panel p-4 rounded-2xl relative overflow-hidden group hover:border-cyan-500/40 text-center">
        <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all pointer-events-none" />

        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Zap className="w-4 h-4" />
          </div>
          <span className="text-xs font-mono font-bold tracking-wider text-slate-400 uppercase">
            TENSION SECTEUR
          </span>
        </div>

        <div className="my-2 flex items-baseline justify-center gap-1.5 font-mono">
          <span className="text-3xl sm:text-4xl font-extrabold text-cyan-300 tracking-tight drop-shadow-[0_0_12px_rgba(0,242,254,0.3)]">
            {tensionStr}
          </span>
          <span className="text-sm font-semibold text-slate-400">V</span>
        </div>

        {/* Decorative Indicator Bar */}
        <div className="mt-3">
          <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${vPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Courant Card */}
      <div className="glass-panel p-4 rounded-2xl relative overflow-hidden group hover:border-amber-500/40 text-center">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all pointer-events-none" />

        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Activity className="w-4 h-4" />
          </div>
          <span className="text-xs font-mono font-bold tracking-wider text-slate-400 uppercase">
            INTENSITÉ CHARGE
          </span>
        </div>

        <div className="my-2 flex items-baseline justify-center gap-1.5 font-mono">
          <span className="text-3xl sm:text-4xl font-extrabold text-amber-300 tracking-tight drop-shadow-[0_0_12px_rgba(245,158,11,0.3)]">
            {courantStr}
          </span>
          <span className="text-sm font-semibold text-slate-400">A</span>
        </div>

        {/* Decorative Indicator Bar */}
        <div className="mt-3">
          <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${iPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. Puissance Card */}
      <div className="glass-panel p-4 rounded-2xl relative overflow-hidden group hover:border-violet-500/40 text-center">
        <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl group-hover:bg-violet-500/20 transition-all pointer-events-none" />

        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
            <Gauge className="w-4 h-4" />
          </div>
          <span className="text-xs font-mono font-bold tracking-wider text-slate-400 uppercase">
            PUISSANCE ACTIVE
          </span>
        </div>

        <div className="my-2 flex items-baseline justify-center gap-1.5 font-mono">
          <span className="text-3xl sm:text-4xl font-extrabold text-violet-300 tracking-tight drop-shadow-[0_0_12px_rgba(139,92,246,0.3)]">
            {puissanceStr}
          </span>
          <span className="text-sm font-semibold text-slate-400">W</span>
        </div>

        {/* Decorative Indicator Bar */}
        <div className="mt-3">
          <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${pPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* 4. Énergie Card */}
      <div className="glass-panel p-4 rounded-2xl relative overflow-hidden group hover:border-emerald-500/40 text-center">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />

        <button
          onClick={onOpenEnergyModal}
          className="absolute top-3 right-3 p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 active:scale-90 transition-all cursor-pointer z-10"
          title="Agrandir et analyser la courbe de consommation"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center justify-center gap-2 mb-2 pr-6">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <span className="text-xs font-mono font-bold tracking-wider text-slate-400 uppercase">
            ÉNERGIE CUMULÉE
          </span>
        </div>

        <div className="my-2 flex items-baseline justify-center gap-1.5 font-mono">
          <span className="text-3xl sm:text-4xl font-extrabold text-emerald-300 tracking-tight drop-shadow-[0_0_12px_rgba(16,185,129,0.3)]">
            {energieKWh}
          </span>
          <span className="text-sm font-semibold text-slate-400">kWh</span>
        </div>

        {/* Decorative Indicator Bar */}
        <div className="mt-3">
          <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full animate-pulse w-full" />
          </div>
        </div>
      </div>
    </div>
  );
};
