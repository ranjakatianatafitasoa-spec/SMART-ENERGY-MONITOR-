import React, { useState, useEffect } from 'react';
import {
  Zap,
  Clock,
  Wifi,
  LayoutGrid,
  Activity,
  FileText,
  Settings,
  Info,
  Shield,
  ShieldCheck,
  Radio,
} from 'lucide-react';
import { ActiveTab, ESP32Data } from '../types';

interface HeaderProps {
  data: ESP32Data;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const Header: React.FC<HeaderProps> = ({ data, activeTab, setActiveTab }) => {
  const [timeStr, setTimeStr] = useState<string>('--:--:--');
  const [dateStr, setDateStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('fr-FR'));
      setDateStr(
        now.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }).toUpperCase()
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="mb-5 space-y-3">
      {/* Top Main Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-4.5 rounded-2xl glass-panel border border-white/10 relative overflow-hidden bg-slate-950/80">
        {/* Ambient Glows */}
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Brand & Date / Time */}
        <div className="flex flex-wrap items-center gap-4 z-10">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-violet-600 p-[1px] shadow-[0_0_20px_rgba(6,182,212,0.35)] shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[15px] flex items-center justify-center">
              <Zap className="w-5 h-5 text-cyan-400 fill-cyan-400/30 animate-pulse" />
            </div>
          </div>

          <div>
            <h1 className="text-lg sm:text-xl font-black tracking-wider uppercase text-white font-mono flex items-center gap-2">
              <span>SMART ENERGY</span>
              <span className="text-cyan-400">MONITOR</span>
            </h1>
          </div>

          {/* Date, Time & WiFi Status next to title */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-slate-300 bg-slate-900/80 px-3.5 py-1.5 rounded-xl border border-slate-800 shrink-0">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-bold text-slate-100">{timeStr}</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">{dateStr}</span>
            <span className="text-slate-500">•</span>
            <div className={`flex items-center gap-1.5 font-semibold ${data.wifiConnected !== false ? 'text-emerald-400' : 'text-rose-400'}`}>
              <Wifi className={`w-3.5 h-3.5 ${data.wifiConnected !== false ? 'animate-pulse' : ''}`} />
              <span>{data.wifiConnected !== false ? 'WiFi CONNECTÉ' : 'WiFi DÉCONNECTÉ'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs (Top Desktop Nav) */}
      <div className="hidden sm:flex items-center gap-1.5 p-1.5 rounded-2xl glass-panel border border-slate-800/80 bg-slate-950/80">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'dashboard'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          <span>DASHBOARD</span>
        </button>

        <button
          onClick={() => setActiveTab('relais')}
          className={`flex-1 px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'relais'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>RELAIS</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'history'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>GRAPHIQUE</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex-1 px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'reports'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>RAPPORTS</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>PARAMÈTRES</span>
        </button>

        <button
          onClick={() => setActiveTab('about')}
          className={`flex-1 px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'about'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Info className="w-4 h-4" />
          <span>À PROPOS</span>
        </button>
      </div>
    </header>
  );
};

