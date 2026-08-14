import React, { useState, useEffect } from 'react';
import {
  Zap,
  Clock,
  Calendar,
  Wifi,
  LayoutGrid,
  Activity,
  FileText,
  Settings,
  Info,
  Shield,
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
          weekday: 'short',
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
    <header className="mb-2.5 space-y-2">
      {/* Top Main Bar with Prominent Title, Scaled Logo & Aligned Status Indicators */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-3 lg:gap-6 px-4 py-2.5 sm:px-6 sm:py-3.5 rounded-2xl glass-panel border border-cyan-500/30 relative overflow-hidden bg-slate-950/90 shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
        {/* Ambient Top Glow Line */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-3/4 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80 blur-[1px] pointer-events-none" />
        
        {/* Ambient Corner Glows */}
        <div className="absolute -top-12 -left-12 w-40 h-40 bg-cyan-500/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Brand Logo & Title (Impactful, Spatially Occupying & High Visibility) */}
        <div className="flex items-center justify-center sm:justify-start gap-3.5 sm:gap-4.5 z-10 shrink-0">
          {/* Scaled Cyber Concentric Emblem Logo */}
          <div className="relative w-12 h-12 sm:w-14 sm:h-14 lg:w-15 lg:h-15 shrink-0 flex items-center justify-center">
            {/* Outer Dashed Spinning Ring */}
            <div className="absolute inset-0 rounded-full border border-dashed border-cyan-400/60 animate-hud-spin-reverse opacity-80" />
            {/* Inner Pulsing Ring */}
            <div className="absolute inset-1 rounded-full border border-cyan-400/40 animate-hud-pulse" />
            
            {/* 3D Cyber Shield Logo Box */}
            <div
              className="relative w-9 h-10 sm:w-10 sm:h-11.5 lg:w-11 lg:h-12.5 rounded-md flex items-center justify-center shadow-lg transition-transform duration-300 hover:scale-105"
              style={{
                background: 'linear-gradient(145deg, #083344 0%, #020617 100%)',
                border: '1.5px solid #22d3ee',
                boxShadow: '0 0 18px rgba(34, 211, 238, 0.65), inset 0 0 12px rgba(34, 211, 238, 0.5)',
                clipPath: 'polygon(50% 0%, 100% 18%, 100% 82%, 50% 100%, 0% 82%, 0% 18%)',
              }}
            >
              <div
                className="absolute inset-0.5 opacity-80"
                style={{
                  background: 'linear-gradient(135deg, #06b6d4 0%, transparent 60%)',
                  clipPath: 'polygon(50% 0%, 100% 18%, 100% 82%, 50% 100%, 0% 82%, 0% 18%)',
                }}
              />
              <Zap className="relative z-10 w-5 h-5 sm:w-6 sm:h-6 lg:w-6.5 lg:h-6.5 text-cyan-300 fill-cyan-300 drop-shadow-[0_0_14px_rgba(34,211,238,1)] animate-pulse" />
            </div>
          </div>

          {/* High-Contrast Cyber Display Title (Large, Eye-Catching, No Wrap) */}
          <div className="text-left">
            <h1 className="text-2xl sm:text-3xl md:text-3.5xl lg:text-4xl font-black tracking-tight uppercase text-white font-sans flex items-center gap-2 sm:gap-3 leading-none whitespace-nowrap">
              <span className="tracking-wide">SMART ENERGY</span>
              <span className="text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.95)] font-black">
                MONITOR
              </span>
            </h1>
          </div>
        </div>

        {/* Live Status Indicators (Date -> Heure -> WiFi) - Cleanly Aligned, Compact & Perfectly Fitted */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 font-mono text-xs z-10 shrink-0 flex-nowrap">
          
          {/* 1. Date Pill */}
          <div className="h-7.5 sm:h-8 flex items-center gap-1.5 text-cyan-300 bg-slate-900/90 px-2 sm:px-2.5 rounded-lg sm:rounded-xl border border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.12)] backdrop-blur-md">
            <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="font-bold text-[10.5px] sm:text-xs tracking-wider uppercase whitespace-nowrap">{dateStr}</span>
          </div>

          {/* 2. Heure Pill */}
          <div className="h-7.5 sm:h-8 flex items-center gap-1.5 text-white bg-slate-900/90 px-2 sm:px-2.5 rounded-lg sm:rounded-xl border border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.12)] backdrop-blur-md">
            <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="font-extrabold text-[10.5px] sm:text-xs tracking-wider text-cyan-200 whitespace-nowrap">{timeStr}</span>
          </div>

          {/* 3. WiFi Status Pill */}
          <div className={`h-7.5 sm:h-8 flex items-center gap-1.5 px-2 sm:px-2.5 rounded-lg sm:rounded-xl border backdrop-blur-md transition-all ${
            data.wifiConnected !== false
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
              : 'bg-rose-500/15 border-rose-500/40 text-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.25)]'
          }`}>
            <Wifi className={`w-3.5 h-3.5 shrink-0 ${data.wifiConnected !== false ? 'animate-pulse text-emerald-400' : 'text-rose-400'}`} />
            <span className="text-[10.5px] sm:text-xs font-bold tracking-wider whitespace-nowrap">
              {data.wifiConnected !== false ? 'WIFI CONNECTÉ' : 'WIFI DÉCONNECTÉ'}
            </span>
            <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0 ${data.wifiConnected !== false ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]' : 'bg-rose-500 shadow-[0_0_6px_#f43f5e] animate-ping'}`} />
          </div>

        </div>
      </div>

      {/* Navigation Tabs (Top Desktop Nav) */}
      <div className="hidden sm:flex items-center gap-1 p-1 rounded-xl sm:rounded-2xl glass-panel border border-slate-800/80 bg-slate-950/80">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'dashboard'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>DASHBOARD</span>
        </button>

        <button
          onClick={() => setActiveTab('relais')}
          className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'relais'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>RELAIS</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'history'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>GRAPHIQUE</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'reports'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>RAPPORTS</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>PARAMÈTRES</span>
        </button>

        <button
          onClick={() => setActiveTab('about')}
          className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'about'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Info className="w-3.5 h-3.5" />
          <span>À PROPOS</span>
        </button>
      </div>
    </header>
  );
};
