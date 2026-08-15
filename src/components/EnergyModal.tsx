import React from 'react';
import { X, TrendingUp, Activity, Leaf, Download, Zap } from 'lucide-react';
import { CanvasChart } from './CanvasChart';

interface EnergyModalProps {
  isOpen: boolean;
  onClose: () => void;
  energieWh: number;
  historyE: number[];
  onDownloadPdf: () => void;
}

export const EnergyModal: React.FC<EnergyModalProps> = ({
  isOpen,
  onClose,
  energieWh,
  historyE,
  onDownloadPdf,
}) => {
  if (!isOpen) return null;

  const energieKWhStr = (energieWh / 1000).toFixed(3);
  const co2Kg = ((energieWh / 1000) * 0.052).toFixed(3); // ~52g CO2/kWh

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl glass-panel border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 relative shadow-2xl overflow-hidden my-auto max-h-[92vh] overflow-y-auto">
        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 p-2 rounded-full bg-slate-900 border border-white/10 text-slate-400 hover:text-white hover:border-emerald-500/40 active:scale-95 transition-all cursor-pointer z-10"
          aria-label="Fermer"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2.5 sm:gap-3 mb-4 sm:mb-6 pr-8">
          <div className="p-2.5 sm:p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider text-slate-400 truncate">
              ANALYSE APPROFONDIE DE LA CONSOMMATION
            </div>
            <h2 className="text-base sm:text-xl font-extrabold text-white flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span>Énergie Cumulée:</span>
              <span className="text-emerald-300 font-mono">{energieKWhStr} kWh</span>
            </h2>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-5 font-mono">
          <div className="p-2 sm:p-3 rounded-xl bg-slate-900/80 border border-white/5">
            <div className="text-[9px] sm:text-[10px] text-slate-400 flex items-center gap-1 uppercase">
              <Zap className="w-3 h-3 text-emerald-400 shrink-0" /> Total Wh
            </div>
            <div className="text-xs xs:text-sm sm:text-lg font-bold text-emerald-300 mt-1 truncate">
              {energieWh.toFixed(1)} Wh
            </div>
          </div>

          <div className="p-2 sm:p-3 rounded-xl bg-slate-900/80 border border-white/5">
            <div className="text-[9px] sm:text-[10px] text-slate-400 flex items-center gap-1 uppercase">
              <Activity className="w-3 h-3 text-cyan-400 shrink-0" /> Rendement
            </div>
            <div className="text-xs xs:text-sm sm:text-lg font-bold text-cyan-300 mt-1 truncate">
              98 %
            </div>
          </div>

          <div className="p-2 sm:p-3 rounded-xl bg-slate-900/80 border border-white/5">
            <div className="text-[9px] sm:text-[10px] text-slate-400 flex items-center gap-1 uppercase">
              <Leaf className="w-3 h-3 text-emerald-400 shrink-0" /> CO₂ Émis
            </div>
            <div className="text-xs xs:text-sm sm:text-lg font-bold text-slate-200 mt-1 truncate">
              {co2Kg} kg
            </div>
          </div>
        </div>

        {/* Energy Chart */}
        <div className="glass-panel p-2.5 sm:p-3.5 rounded-2xl mb-4 sm:mb-6 border border-emerald-500/20">
          <CanvasChart
            data={historyE}
            color="#10b981"
            unit="Wh"
            title="Courbe d'accumulation Énergie (Wh)"
          />
        </div>

        {/* Download PDF Button */}
        <button
          onClick={onDownloadPdf}
          className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:brightness-110 active:scale-98 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(16,185,129,0.35)] transition-all cursor-pointer"
        >
          <Download className="w-5 h-5" />
          <span>Exporter le Rapport Énergie en PDF ⬇</span>
        </button>
      </div>
    </div>
  );
};
