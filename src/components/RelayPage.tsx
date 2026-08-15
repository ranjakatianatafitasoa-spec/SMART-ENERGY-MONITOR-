import React from 'react';
import {
  Shield,
  Zap,
  RotateCcw,
  RefreshCw,
  Power,
  ShieldCheck,
  AlertTriangle,
  Activity,
} from 'lucide-react';
import { ESP32Data } from '../types';
import { SystemSettings } from './SettingsTab';

interface RelayPageProps {
  data: ESP32Data;
  settings: SystemSettings;
  onToggleRelay: () => void;
  onRepasserAuto: () => void;
  onRecalibrer: () => void;
}

export const RelayPage: React.FC<RelayPageProps> = ({
  data,
  settings,
  onToggleRelay,
  onRepasserAuto,
  onRecalibrer,
}) => {
  const isAutoMode = !data.manuel;
  const isRelayOn = data.relais;

  // Check if current electrical conditions are within fixed thresholds
  const isVoltageOk = data.tension >= settings.minVoltage && data.tension <= settings.maxVoltage && data.tension > 0;
  const isCurrentOk = data.courant <= settings.maxCurrent;
  const isSystemSafe = isVoltageOk && isCurrentOk;

  return (
    <div className="space-y-3.5 animate-fadeIn max-w-3xl mx-auto min-h-[60vh] sm:min-h-[68vh] flex flex-col justify-between font-mono">
      {/* Primary Relay Control Card */}
      <div className="glass-panel p-5 sm:p-7 rounded-3xl border border-slate-800/90 bg-slate-950/90 shadow-2xl flex-1 flex flex-col justify-between space-y-4">
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
            <div>
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
              <div className="text-[11px] text-slate-400 mt-0.5">
                {isAutoMode
                  ? 'Protection automatique asservie aux seuils'
                  : 'Forçage manuel actif — Automatismes suspendus'}
              </div>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border flex items-center gap-1.5 ${
              isSystemSafe
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
            }`}>
              {isSystemSafe ? <ShieldCheck className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              <span>{isSystemSafe ? 'Paramètres nominaux' : 'Seuil dépassé'}</span>
            </span>
          </div>
        </div>

        {/* Central Tactical Push Button & Mode */}
        <div className="flex flex-col items-center justify-center py-4 sm:py-6 my-auto space-y-6">
          <button
            onClick={onToggleRelay}
            className={`relative group p-3 rounded-full transition-all duration-300 cursor-pointer focus:outline-none ${
              isRelayOn
                ? 'shadow-[0_0_50px_rgba(16,185,129,0.45)]'
                : 'shadow-[0_0_50px_rgba(239,68,68,0.45)]'
            }`}
            aria-label="Basculer l'état du relais"
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

        {/* Live Safety Envelope & Thresholds status */}
        <div className="pt-3 border-t border-slate-800/80 bg-slate-900/40 -mx-5 -mb-5 sm:-mx-7 sm:-mb-7 p-4 sm:p-5 rounded-b-3xl space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span className="flex items-center gap-1.5 uppercase text-slate-300">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              Surveillance des seuils actifs
            </span>
            <span className="text-cyan-300 font-mono">
              U: {data.tension.toFixed(1)}V | I: {data.courant.toFixed(2)}A
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-[10.5px]">
            <div className={`p-2 rounded-xl border ${
              data.tension < settings.minVoltage && data.tension > 0
                ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                : 'bg-slate-950/80 border-slate-800 text-slate-300'
            }`}>
              <div className="text-slate-500 text-[9px] uppercase font-bold">Min Tension</div>
              <div className="font-bold text-cyan-300 text-xs">{settings.minVoltage} V</div>
            </div>

            <div className={`p-2 rounded-xl border ${
              data.tension > settings.maxVoltage
                ? 'bg-rose-500/15 border-rose-500 text-rose-300'
                : 'bg-slate-950/80 border-slate-800 text-slate-300'
            }`}>
              <div className="text-slate-500 text-[9px] uppercase font-bold">Max Tension</div>
              <div className="font-bold text-cyan-300 text-xs">{settings.maxVoltage} V</div>
            </div>

            <div className={`p-2 rounded-xl border ${
              data.courant > settings.maxCurrent
                ? 'bg-rose-500/15 border-rose-500 text-rose-300'
                : 'bg-slate-950/80 border-slate-800 text-slate-300'
            }`}>
              <div className="text-slate-500 text-[9px] uppercase font-bold">Max Courant</div>
              <div className="font-bold text-amber-300 text-xs">{settings.maxCurrent} A</div>
            </div>
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
