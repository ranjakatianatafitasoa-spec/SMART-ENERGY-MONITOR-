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
    <div className="space-y-4 animate-fadeIn max-w-2xl mx-auto">
      {/* Primary Relay Control Card */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-800 bg-slate-950/80 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <div className="relative flex items-center justify-center">
                <Shield className="w-5 h-5" />
                <Zap className="w-2.5 h-2.5 absolute fill-cyan-400 text-cyan-400" />
              </div>
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-mono font-black uppercase tracking-wider text-slate-100">
                COMMANDE DU RELAIS SECTEUR
              </h2>
            </div>
          </div>
        </div>

        {/* Central Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-4 py-1">
          {/* Mode Indicator */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-center items-center text-center space-y-1">
            <span className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">
              MODE D'EXPLOITATION
            </span>
            <div
              className={`text-base font-black font-mono tracking-wide ${
                isAutoMode ? 'text-emerald-400' : 'text-cyan-400'
              }`}
            >
              {isAutoMode ? 'AUTOMATIQUE' : 'MANUEL'}
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              {isAutoMode
                ? 'Protection auto active'
                : 'Contrôle manuel forcé'}
            </span>
          </div>

          {/* Central Push Button (Vert = ON, Rouge = OFF) */}
          <div className="flex flex-col items-center justify-center">
            <button
              onClick={onToggleRelay}
              title={isRelayOn ? 'Relais ACTIVÉ (Vert) - Cliquer pour couper' : 'Relais COUPÉ (Rouge) - Cliquer pour enclencher'}
              className={`relative group p-1.5 rounded-full transition-all duration-300 cursor-pointer focus:outline-none ${
                isRelayOn
                  ? 'shadow-[0_0_30px_rgba(16,185,129,0.5)]'
                  : 'shadow-[0_0_30px_rgba(239,68,68,0.5)]'
              }`}
            >
              {/* Ring Outer */}
              <div
                className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                  isRelayOn
                    ? 'border-emerald-500 bg-gradient-to-b from-emerald-950/90 to-slate-950'
                    : 'border-rose-500 bg-gradient-to-b from-rose-950/90 to-slate-950'
                }`}
              >
                {/* Inner Glowing Button */}
                <div
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-105 ${
                    isRelayOn
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-slate-950 shadow-[0_0_25px_rgba(16,185,129,0.7)]'
                      : 'bg-gradient-to-br from-rose-600 to-red-600 text-white shadow-[0_0_25px_rgba(239,68,68,0.7)]'
                  }`}
                >
                  <Power className="w-8 h-8 stroke-[2.5]" />
                </div>
              </div>
            </button>
          </div>

          {/* Action: Return to Auto Mode Button */}
          <div className="flex flex-col items-center justify-center">
            <button
              onClick={onRepasserAuto}
              className={`w-full p-3.5 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                isAutoMode
                  ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                  : 'border-cyan-500/80 bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500 shadow-md'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {isAutoMode ? 'MODE AUTO ACTIF' : 'REVENIR EN AUTOMATIQUE'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Calibration Button Only */}
      <div className="glass-panel p-3.5 rounded-xl border border-slate-800 bg-slate-950/80 font-mono text-xs flex justify-center">
        <button
          onClick={onRecalibrer}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
          <span>Calibrer les capteurs</span>
        </button>
      </div>
    </div>
  );
};

