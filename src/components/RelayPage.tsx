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
    <div className="space-y-4 animate-fadeIn max-w-4xl mx-auto min-h-[65vh] sm:min-h-[72vh] flex flex-col justify-between font-mono">
      {/* Primary Relay Control Card */}
      <div className="glass-panel p-4 sm:p-6 rounded-3xl border border-slate-800/90 bg-slate-950/90 shadow-2xl flex-1 flex flex-col justify-between">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
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
            <div>
              <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-100 flex items-center gap-2">
                <span>COMMANDE DU RELAIS</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                  isRelayOn
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                }`}>
                  {isRelayOn ? 'ENCLENCHÉ' : 'COUPÉ'}
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
            <span className={`font-bold px-2.5 py-1 rounded-lg border ${
              isRelayOn
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
            }`}>
              GPIO 26 : {isRelayOn ? 'LOW' : 'HIGH'}
            </span>
          </div>
        </div>

        {/* Central Controls Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 items-center gap-6 py-6 my-auto">
          {/* 1. Mode Status Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex flex-col justify-center items-center text-center space-y-2 h-full">
            <span className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">
              RÉGIME
            </span>
            <div
              className={`text-xl sm:text-2xl font-black tracking-wide ${
                isAutoMode ? 'text-emerald-400' : 'text-cyan-400'
              }`}
            >
              {isAutoMode ? 'AUTOMATIQUE' : 'MANUEL'}
            </div>
          </div>

          {/* 2. Central Tactile Push Button */}
          <div className="flex flex-col items-center justify-center">
            <button
              onClick={onToggleRelay}
              className={`relative group p-2 rounded-full transition-all duration-300 cursor-pointer focus:outline-none ${
                isRelayOn
                  ? 'shadow-[0_0_40px_rgba(16,185,129,0.5)]'
                  : 'shadow-[0_0_40px_rgba(239,68,68,0.5)]'
              }`}
            >
              <div
                className={`w-32 h-32 sm:w-36 sm:h-36 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                  isRelayOn
                    ? 'border-emerald-500 bg-gradient-to-b from-emerald-950/90 via-slate-950 to-slate-950'
                    : 'border-rose-500 bg-gradient-to-b from-rose-950/90 via-slate-950 to-slate-950'
                }`}
              >
                <div
                  className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full flex flex-col items-center justify-center transition-transform duration-300 group-hover:scale-105 ${
                    isRelayOn
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-slate-950 shadow-[0_0_30px_rgba(16,185,129,0.8)]'
                      : 'bg-gradient-to-br from-rose-600 to-red-600 text-white shadow-[0_0_30px_rgba(239,68,68,0.8)]'
                  }`}
                >
                  <Power className="w-10 h-10 stroke-[2.5]" />
                  <span className="text-[11px] font-black mt-1 uppercase tracking-wider">
                    {isRelayOn ? 'ACTIF' : 'COUPÉ'}
                  </span>
                </div>
              </div>
            </button>
          </div>

          {/* 3. Action & Live Values */}
          <div className="flex flex-col justify-center space-y-3 h-full">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Tension :</span>
                <span className="font-bold text-cyan-300">{data.tension.toFixed(1)} V</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Courant :</span>
                <span className="font-bold text-amber-300">{data.courant.toFixed(2)} A</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Puissance :</span>
                <span className="font-bold text-violet-300">{data.puissance.toFixed(0)} W</span>
              </div>
            </div>

            <button
              onClick={onRepasserAuto}
              className={`w-full py-3 px-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                isAutoMode
                  ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                  : 'border-cyan-500/80 bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500 shadow-lg active:scale-95'
              }`}
            >
              <RotateCcw className="w-4 h-4 text-emerald-400" />
              <span>
                {isAutoMode ? 'MODE AUTO ACTIF' : 'PASSER EN AUTO'}
              </span>
            </button>
          </div>
        </div>

        {/* Calibration Action Bar */}
        <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-400">
            <RefreshCw className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Étalonnage des capteurs (Zéro dynamique)</span>
          </div>

          <button
            onClick={onRecalibrer}
            className="px-4 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Calibrer</span>
          </button>
        </div>
      </div>
    </div>
  );
};
