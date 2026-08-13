import React from 'react';
import { TrendingUp, Calendar, ChevronRight, Activity } from 'lucide-react';
import { ESP32Data } from '../types';

interface LiveEvolutionCardProps {
  data: ESP32Data;
  historyV: number[];
  historyI: number[];
  historyP: number[];
  onGoToSignal: () => void;
}

export const LiveEvolutionCard: React.FC<LiveEvolutionCardProps> = ({
  data,
  historyV,
  historyI,
  historyP,
  onGoToSignal,
}) => {
  // Compute recent averages
  const avgV = historyV.length > 0
    ? (historyV.reduce((a, b) => a + b, 0) / historyV.length).toFixed(1)
    : data.tension.toFixed(1);

  const avgI = historyI.length > 0
    ? (historyI.reduce((a, b) => a + b, 0) / historyI.length).toFixed(2)
    : data.courant.toFixed(2);

  const avgP = historyP.length > 0
    ? Math.round(historyP.reduce((a, b) => a + b, 0) / historyP.length)
    : Math.round(data.puissance);

  const totalE = (data.energie / 1000).toFixed(3);

  return (
    <div className="p-4 rounded-2xl glass-panel border border-slate-800/80 bg-slate-950/80 shadow-2xl mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-100">
            ÉVOLUTION EN TEMPS RÉEL
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-cyan-400" />
            <span>10 min</span>
          </div>

          <button
            onClick={onGoToSignal}
            className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 text-[11px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-all"
          >
            <Activity className="w-3 h-3" />
            <span>Signal</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 4 Average Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
        {/* Tension Moy */}
        <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/60">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">
            Tension moy.
          </div>
          <div className="text-base font-extrabold text-cyan-400 mt-0.5">
            {avgV} <span className="text-xs font-normal text-slate-400">V</span>
          </div>
        </div>

        {/* Courant Moy */}
        <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/60">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">
            Courant moy.
          </div>
          <div className="text-base font-extrabold text-amber-400 mt-0.5">
            {avgI} <span className="text-xs font-normal text-slate-400">A</span>
          </div>
        </div>

        {/* Puissance Moy */}
        <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/60">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">
            Puissance moy.
          </div>
          <div className="text-base font-extrabold text-violet-400 mt-0.5">
            {avgP} <span className="text-xs font-normal text-slate-400">W</span>
          </div>
        </div>

        {/* Énergie Totale */}
        <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/60">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">
            Énergie totale
          </div>
          <div className="text-base font-extrabold text-emerald-400 mt-0.5">
            {totalE} <span className="text-xs font-normal text-slate-400">kWh</span>
          </div>
        </div>
      </div>
    </div>
  );
};
