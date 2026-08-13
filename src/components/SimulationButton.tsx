import React, { useState } from 'react';
import { ZapOff, Zap, ShieldAlert, AlertTriangle, RefreshCw, ChevronUp, ChevronDown } from 'lucide-react';

interface SimulationButtonProps {
  isOutage: boolean;
  onToggleOutage: () => void;
  onSimulateOvervoltage?: () => void;
  onSimulateOvercurrent?: () => void;
  onResetNormal?: () => void;
}

export const SimulationButton: React.FC<SimulationButtonProps> = ({
  isOutage,
  onToggleOutage,
  onSimulateOvervoltage,
  onSimulateOvercurrent,
  onResetNormal,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      {/* Expanded Fault Test Suite */}
      {isOpen && (
        <div className="glass-panel p-3 rounded-2xl border border-white/10 shadow-2xl flex flex-col gap-2 min-w-[220px] animate-fadeIn">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-white/5">
            TESTS D'INJECTION DE PANNE
          </div>

          <button
            onClick={onToggleOutage}
            className={`px-3 py-2 rounded-xl text-xs font-mono font-semibold flex items-center justify-between gap-2 transition-all cursor-pointer ${
              isOutage
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <ZapOff className="w-3.5 h-3.5" />
              {isOutage ? 'Rétablir Secteur' : 'Coupure Secteur (0V)'}
            </span>
          </button>

          {onSimulateOvervoltage && (
            <button
              onClick={onSimulateOvervoltage}
              className="px-3 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 text-xs font-mono font-semibold flex items-center justify-between gap-2 transition-all cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Surtension (265V)
              </span>
            </button>
          )}

          {onSimulateOvercurrent && (
            <button
              onClick={onSimulateOvercurrent}
              className="px-3 py-2 rounded-xl bg-orange-500/20 text-orange-300 border border-orange-500/40 hover:bg-orange-500/30 text-xs font-mono font-semibold flex items-center justify-between gap-2 transition-all cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" /> Surcharge (5.5A)
              </span>
            </button>
          )}

          {onResetNormal && (
            <button
              onClick={onResetNormal}
              className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-white/10 text-xs font-mono font-semibold flex items-center justify-between gap-2 transition-all cursor-pointer mt-1"
            >
              <span className="flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" /> Réinitialiser Normal
              </span>
            </button>
          )}
        </div>
      )}

      {/* Main Trigger Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2.5 rounded-2xl glass-panel border border-violet-500/40 bg-slate-900/90 text-white font-mono text-xs font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
      >
        <Zap className="w-4 h-4 text-violet-400" />
        <span>SIMULATEUR DE PANNE</span>
        {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronUp className="w-3.5 h-3.5 text-slate-400" />}
      </button>
    </div>
  );
};
