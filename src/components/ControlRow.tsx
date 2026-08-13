import React from 'react';
import {
  Shield,
  Zap,
  Power,
  Hand,
  ChevronRight,
  FileText,
  Sliders,
  RotateCcw,
} from 'lucide-react';
import { ESP32Data } from '../types';

interface ControlRowProps {
  data: ESP32Data;
  historyCount: number;
  incidentCount: number;
  onToggleRelay: () => void;
  onRepasserAuto: () => void;
  onRecalibrer: () => void;
  onGenererRapportPDF: () => void;
  onNavigateToReports?: (filter?: 'all' | 'incidents') => void;
}

export const ControlRow: React.FC<ControlRowProps> = ({
  data,
  historyCount,
  incidentCount,
  onToggleRelay,
  onRepasserAuto,
  onRecalibrer,
  onGenererRapportPDF,
  onNavigateToReports,
}) => {
  const isAutoMode = !data.manuel;
  const isRelayOn = data.relais;

  const getStatusMessage = () => {
    if (!isRelayOn && isAutoMode && data.rearmement !== undefined && data.rearmement >= 0) {
      return `Réarmement automatique dans ${data.rearmement} s`;
    }
    if (!isRelayOn) {
      return 'Relais désactivé — Circuit interrompu (0V)';
    }
    return isAutoMode
      ? 'Relais activé — Protection active'
      : 'Relais activé — Contrôle manuel (230V)';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
      {/* 1. CONTRÔLE RELAIS CARD */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 bg-slate-950/80 shadow-2xl flex flex-col justify-between gap-4">
        {/* Card Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <div className="relative flex items-center justify-center">
                <Shield className="w-5 h-5" />
                <Zap className="w-2.5 h-2.5 absolute fill-cyan-400 text-cyan-400" />
              </div>
            </div>
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-100">
              CONTRÔLE RELAIS
            </h2>
          </div>

          {/* Optional recalibrate button */}
          <button
            onClick={onRecalibrer}
            className="p-1.5 rounded-lg bg-slate-900 border border-white/10 text-slate-400 hover:text-white hover:border-cyan-500/40 transition-all cursor-pointer"
            title="Recalibrer le zéro capteur"
          >
            <Sliders className="w-4 h-4 text-cyan-400" />
          </button>
        </div>

        {/* Central Display & Control Area */}
        <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-4 py-2">
          {/* Left column: Current Mode indicator */}
          <div className="flex flex-col justify-center">
            <span className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">
              MODE ACTUEL
            </span>
            <span
              className={`text-sm sm:text-base font-extrabold tracking-wide font-mono mt-0.5 ${
                isAutoMode ? 'text-emerald-400' : 'text-cyan-400'
              }`}
            >
              {isAutoMode ? 'AUTOMATIQUE' : 'MANUEL'}
            </span>
          </div>

          {/* Center column: Glowing Relais Badge / Dial */}
          <div className="flex justify-center my-1 sm:my-0">
            <button
              onClick={onToggleRelay}
              className={`relative group p-1.5 rounded-full transition-all duration-300 cursor-pointer focus:outline-none ${
                isRelayOn
                  ? 'shadow-[0_0_30px_rgba(16,185,129,0.35)]'
                  : 'shadow-[0_0_30px_rgba(239,68,68,0.35)]'
              }`}
              title={isRelayOn ? 'Cliquer pour couper le relais' : 'Cliquer pour activer le relais'}
            >
              {/* Outer Ring */}
              <div
                className={`w-20 h-20 sm:w-22 sm:h-22 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                  isRelayOn
                    ? 'border-emerald-500/60 bg-gradient-to-b from-emerald-950/80 to-slate-950/90'
                    : 'border-rose-500/60 bg-gradient-to-b from-rose-950/80 to-slate-950/90'
                }`}
              >
                {/* Inner Glowing Shield Container */}
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-105 ${
                    isRelayOn
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.5)]'
                      : 'bg-gradient-to-br from-rose-600 to-red-700 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)]'
                  }`}
                >
                  <div className="relative flex items-center justify-center">
                    <Shield className="w-8 h-8 fill-current stroke-[1.5]" />
                    <Zap className={`w-4 h-4 absolute ${isRelayOn ? 'fill-slate-950 text-slate-950' : 'fill-white text-white'}`} />
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* Right column: Auto & Manual Selector Pills */}
          <div className="flex sm:flex-col justify-center sm:items-end gap-2">
            <button
              onClick={onRepasserAuto}
              className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-bold transition-all cursor-pointer border ${
                isAutoMode
                  ? 'border-emerald-500/80 bg-emerald-500/10 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              AUTO
            </button>

            <button
              onClick={() => {
                if (isAutoMode) {
                  onToggleRelay(); // Switch to manual state toggle
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                !isAutoMode
                  ? 'border-cyan-500/80 bg-cyan-500/15 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                  : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Hand className="w-3.5 h-3.5 text-cyan-400" />
              <span>MANUEL</span>
            </button>
          </div>
        </div>

        {/* Bottom Row: Main Action Button & Status Note */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
          <button
            onClick={onToggleRelay}
            className={`px-5 py-2.5 rounded-xl font-mono text-xs font-extrabold flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-lg hover:scale-[1.02] active:scale-[0.98] ${
              isRelayOn
                ? 'bg-gradient-to-r from-red-700 via-rose-600 to-red-800 text-white shadow-rose-900/40 hover:shadow-rose-600/50'
                : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-emerald-900/40 hover:shadow-emerald-600/50'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{isRelayOn ? 'COUPER' : 'ALLUMER'}</span>
          </button>

          <div className="text-xs font-mono text-slate-300 flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                isRelayOn ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]' : 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
              }`}
            />
            <span>{getStatusMessage()}</span>
          </div>
        </div>
      </div>

      {/* 2. HISTORIQUE & RAPPORTS CARD */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 bg-slate-950/80 shadow-2xl flex flex-col justify-between gap-3">
        {/* Card Header */}
        <div className="flex items-center gap-2.5 mb-1">
          <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-400">
            <FileText className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-100">
            HISTORIQUE & RAPPORTS
          </h2>
        </div>

        {/* 3 Interactive Rows */}
        <div className="space-y-2.5">
          {/* Row 1: Relevés enregistrés */}
          <button
            onClick={() => onNavigateToReports?.('all')}
            className="w-full p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/60 hover:border-slate-700 transition-all flex items-center justify-between gap-3 text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
                <div className="relative flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                  <Zap className="w-2 h-2 absolute fill-emerald-400 text-emerald-400" />
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">
                  Relevés enregistrés
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Aujourd'hui
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xl font-bold font-mono text-cyan-400">
                {historyCount}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
            </div>
          </button>

          {/* Row 2: Incidents détectés */}
          <button
            onClick={() => onNavigateToReports?.('incidents')}
            className="w-full p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/60 hover:border-slate-700 transition-all flex items-center justify-between gap-3 text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 shrink-0">
                <div className="relative flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                  <Zap className="w-2 h-2 absolute fill-rose-400 text-rose-400" />
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-200 group-hover:text-rose-300 transition-colors">
                  Incidents détectés
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Aujourd'hui
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-xl font-bold font-mono ${
                  incidentCount > 0 ? 'text-rose-400' : 'text-slate-400'
                }`}
              >
                {incidentCount}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-rose-400 transition-colors" />
            </div>
          </button>

          {/* Row 3: Rapport PDF Button */}
          <button
            onClick={onGenererRapportPDF}
            className="w-full p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-violet-500/50 hover:bg-slate-900/90 transition-all flex items-center justify-between gap-3 cursor-pointer group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-200 group-hover:text-violet-300 transition-colors">
                  Rapport PDF
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Générer le rapport complet
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* PDF Badge Icon */}
              <div className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-rose-600 to-red-600 text-white font-mono font-bold text-[10px] tracking-wider shadow-md flex items-center gap-1 group-hover:scale-105 transition-transform">
                <FileText className="w-3 h-3 text-white" />
                <span>PDF</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-violet-400 transition-colors" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

