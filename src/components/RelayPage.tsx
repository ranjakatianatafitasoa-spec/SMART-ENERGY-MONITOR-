import React from 'react';
import {
  Shield,
  Zap,
  RotateCcw,
  RefreshCw,
  Power,
} from 'lucide-react';
import { ESP32Data } from '../types';

interface RelayPageProps {
  data: ESP32Data;
  onToggleRelay: () => void;
  onRepasserAuto: () => void;
  onRecalibrer: () => void;
}

export const RelayPage: React.FC<RelayPageProps> = ({
  data,
  onToggleRelay,
  onRepasserAuto,
  onRecalibrer,
}) => {
  const isAutoMode = !data.manuel;
  const isRelayOn = data.relais;

  return (
    <div className="space-y-3.5 animate-fadeIn max-w-3xl mx-auto min-h-[60vh] sm:min-h-[68vh] flex flex-col justify-between font-mono">
      {/* Primary Relay Control Card */}
      <div className="glass-panel p-5 sm:p-7 rounded-3xl border border-slate-800/90 bg-slate-950/90 shadow-2xl flex-1 flex flex-col justify-between">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl border ${
              isRelayOn
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}>
              <div className="relative flex items-center justify-center">
                <Shield className="w-6 h-6" />
                <Zap className={`w-3 h-3 absolute ${isRelayOn ? 'fill-emerald-400 text-emerald-400' : 'fill-rose-400 text-rose-400'}`} />
              </div>
            </div>
            <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-100 flex items-center gap-2.5">
              <span>COMMANDE DU RELAIS</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                isRelayOn
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
              }`}>
                {isRelayOn ? 'ENCLENCHÉ' : 'COUPÉ'}
              </span>
            </h2>
          </div>
        </div>

        {/* Central Tactical Push Button & Mode */}
        <div className="flex flex-col items-center justify-center py-8 my-auto space-y-6">
          <button
            onClick={onToggleRelay}
            className={`relative group p-3 rounded-full transition-all duration-300 cursor-pointer focus:outline-none ${
              isRelayOn
                ? 'shadow-[0_0_50px_rgba(16,185,129,0.45)]'
                : 'shadow-[0_0_50px_rgba(239,68,68,0.45)]'
            }`}
          >
            <div
              className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                isRelayOn
                  ? 'border-emerald-500 bg-gradient-to-b from-emerald-950/90 via-slate-950 to-slate-950'
                  : 'border-rose-500 bg-gradient-to-b from-rose-950/90 via-slate-950 to-slate-950'
              }`}
            >
              <div
                className={`w-28 h-28 sm:w-34 sm:h-34 rounded-full flex flex-col items-center justify-center transition-transform duration-300 group-hover:scale-105 ${
                  isRelayOn
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-slate-950 shadow-[0_0_35px_rgba(16,185,129,0.8)]'
                    : 'bg-gradient-to-br from-rose-600 to-red-600 text-white shadow-[0_0_35px_rgba(239,68,68,0.8)]'
                }`}
              >
                <Power className="w-12 h-12 stroke-[2.5]" />
                <span className="text-xs font-black mt-1 uppercase tracking-wider">
                  {isRelayOn ? 'ACTIF' : 'COUPÉ'}
                </span>
              </div>
            </div>
          </button>

          {/* Mode switch button */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-bold flex items-center gap-2">
              <span className="text-slate-400">RÉGIME :</span>
              <span className={isAutoMode ? 'text-emerald-400 font-black' : 'text-cyan-400 font-black'}>
                {isAutoMode ? 'AUTOMATIQUE' : 'MANUEL'}
              </span>
            </div>

            <button
              onClick={onRepasserAuto}
              className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                isAutoMode
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                  : 'border-cyan-500/80 bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500 shadow-md active:scale-95'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isAutoMode ? 'MODE AUTO ACTIF' : 'PASSER EN AUTO'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Standalone Calibration Button OUTSIDE the main relay card */}
      <div className="flex justify-end pt-1">
        <button
          onClick={onRecalibrer}
          className="px-6 py-2.5 rounded-xl bg-slate-900/90 hover:bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 shadow-lg"
        >
          <RefreshCw className="w-4 h-4 text-cyan-400" />
          <span>Calibrer</span>
        </button>
      </div>
    </div>
  );
};
