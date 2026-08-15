import React from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  ZapOff,
  Zap,
  Activity,
  Shield,
} from 'lucide-react';
import { NiveauStatus } from '../types';

interface StatusBarProps {
  niveau: NiveauStatus;
  message: string;
  relais?: boolean;
  tension?: number;
  courant?: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  niveau,
  message,
  relais = true,
  tension = 0,
  courant = 0,
}) => {
  const isCoupure = tension === 0 || (message && message.toLowerCase().includes('coupure'));
  const isRelaisOff = !relais;

  // Compute theme configuration based on real operational states
  const getConfig = () => {
    // 1. COUPURE SECTEUR (0V)
    if (isCoupure) {
      return {
        theme: 'coupure',
        accentColor: '#38bdf8', // Cyan / Electric ice blue
        accentGlow: 'rgba(56, 189, 248, 0.35)',
        borderColor: 'border-sky-500/60',
        bgGradient: 'from-sky-950/40 via-slate-950/90 to-slate-950',
        badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-400/50',
        badgeText: 'COUPURE',
        badgeIcon: <ZapOff className="w-3 h-3 text-sky-400" />,
        titleMain: 'COUPURE',
        titleHighlight: 'SECTEUR (0V)',
        titleColor: 'text-sky-400',
        indicatorNet: { label: 'RÉSEAU', value: '0V / COUPÉ', color: 'text-sky-300' },
        indicatorVolt: { label: 'TENSION', value: '0.0 V', color: 'text-sky-300' },
        indicatorSys: { label: 'SYSTÈME', value: 'EN ATTENTE', color: 'text-slate-400' },
        relayTitle: 'RELAIS OFF',
        relayColor: 'text-sky-400',
        relaySub: 'Absence de secteur',
        relayBoxBorder: 'border-sky-500/40 shadow-[0_0_15px_rgba(56,189,248,0.15)]',
        shieldIcon: <ZapOff className="w-5 h-5 text-white drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]" />,
      };
    }

    // 2. DANGER CRITIQUE (Surtension, Surcharge, Disjonction)
    if (niveau === 'DANGER') {
      return {
        theme: 'danger',
        accentColor: '#f43f5e', // Rose / Red neon
        accentGlow: 'rgba(244, 63, 94, 0.4)',
        borderColor: 'border-rose-500/70',
        bgGradient: 'from-rose-950/40 via-slate-950/90 to-slate-950',
        badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-400/50',
        badgeText: 'DANGER',
        badgeIcon: <AlertTriangle className="w-3 h-3 text-rose-400" />,
        titleMain: 'ALERTE',
        titleHighlight: 'CRITIQUE',
        titleColor: 'text-rose-500 drop-shadow-[0_0_12px_rgba(244,63,94,0.6)]',
        indicatorNet: { label: 'RÉSEAU', value: 'CRITIQUE', color: 'text-rose-400' },
        indicatorVolt: { label: 'TENSION', value: tension ? `${tension.toFixed(0)} V` : 'ANOMALIE', color: 'text-rose-400' },
        indicatorSys: { label: 'SYSTÈME', value: 'DISJONCTION', color: 'text-rose-300' },
        relayTitle: isRelaisOff ? 'RELAIS DISJONCTÉ' : 'RELAIS ACTIF',
        relayColor: 'text-rose-400',
        relaySub: isRelaisOff ? 'Coupure sécurité' : 'Seuil dépassé',
        relayBoxBorder: 'border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.2)]',
        shieldIcon: <ShieldAlert className="w-5 h-5 text-white drop-shadow-[0_0_8px_rgba(244,63,94,0.9)]" />,
      };
    }

    // 3. AVERTISSEMENT / ATTENTION
    if (niveau === 'ATTENTION') {
      return {
        theme: 'attention',
        accentColor: '#f59e0b', // Amber / Gold neon
        accentGlow: 'rgba(245, 158, 11, 0.35)',
        borderColor: 'border-amber-500/60',
        bgGradient: 'from-amber-950/35 via-slate-950/90 to-slate-950',
        badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-400/50',
        badgeText: 'ATTENTION',
        badgeIcon: <AlertTriangle className="w-3 h-3 text-amber-400" />,
        titleMain: 'AVERTISSEMENT',
        titleHighlight: 'RÉSEAU',
        titleColor: 'text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]',
        indicatorNet: { label: 'RÉSEAU', value: 'PERTURBÉ', color: 'text-amber-300' },
        indicatorVolt: { label: 'TENSION', value: `${tension.toFixed(0)} V`, color: 'text-amber-300' },
        indicatorSys: { label: 'SYSTÈME', value: 'VIGILANCE', color: 'text-amber-200' },
        relayTitle: isRelaisOff ? 'RELAIS OFF' : 'RELAIS OK',
        relayColor: isRelaisOff ? 'text-amber-400' : 'text-amber-300',
        relaySub: isRelaisOff ? 'Sortie coupée' : 'Surveillance',
        relayBoxBorder: 'border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)]',
        shieldIcon: <AlertTriangle className="w-5 h-5 text-white drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]" />,
      };
    }

    // 4. NORMAL (Réseau Stable & Conforme)
    return {
      theme: 'normal',
      accentColor: '#10b981', // Emerald / Bright Cyber Green
      accentGlow: 'rgba(16, 185, 129, 0.35)',
      borderColor: 'border-emerald-500/50',
      bgGradient: 'from-emerald-950/35 via-slate-950/90 to-slate-950',
      badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50',
      badgeText: 'NORMAL',
      badgeIcon: <ShieldCheck className="w-3 h-3 text-emerald-400" />,
      titleMain: 'RÉSEAU',
      titleHighlight: 'STABLE',
      titleColor: 'text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.7)]',
      indicatorNet: { label: 'RÉSEAU', value: 'NORMAL', color: 'text-emerald-400' },
      indicatorVolt: { label: 'TENSION', value: 'STABLE', color: 'text-emerald-400' },
      indicatorSys: { label: 'SYSTÈME', value: 'SÉCURISÉ', color: 'text-emerald-400' },
      relayTitle: isRelaisOff ? 'RELAIS OFF' : 'RELAIS OK',
      relayColor: isRelaisOff ? 'text-amber-400' : 'text-emerald-400',
      relaySub: isRelaisOff ? 'Sortie désactivée' : 'Protection active',
      relayBoxBorder: isRelaisOff
        ? 'border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
        : 'border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.2)]',
      shieldIcon: <CheckCircle2 className="w-5 h-5 text-slate-950 drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]" />,
    };
  };

  const cfg = getConfig();

  return (
    <div
      className={`relative overflow-hidden rounded-2xl sm:rounded-3xl border ${cfg.borderColor} bg-gradient-to-b ${cfg.bgGradient} px-3.5 py-3 sm:px-5 sm:py-3.5 transition-all duration-300 shadow-[0_8px_25px_-5px_rgba(0,0,0,0.6)] font-sans`}
      style={{
        boxShadow: `0 0 25px -5px ${cfg.accentGlow}, inset 0 1px 2px rgba(255,255,255,0.12)`,
      }}
    >
      {/* Top Ambient Glow Line */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-2/3 rounded-full pointer-events-none opacity-70 blur-[1px]"
        style={{
          background: `linear-gradient(90deg, transparent, ${cfg.accentColor}, transparent)`,
        }}
      />

      {/* Cyber vector wave background */}
      <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
        <svg
          viewBox="0 0 1000 180"
          className="w-full h-full object-cover object-bottom"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d="M0 140 Q180 110 360 140 T720 135 T1000 140"
            stroke={cfg.accentColor}
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          <path
            d="M0 160 Q250 130 500 160 T1000 160"
            stroke={cfg.accentColor}
            strokeWidth="0.8"
          />
          {/* Pylon Silhouette on right */}
          <g stroke={cfg.accentColor} strokeWidth="1" opacity="0.8">
            <path d="M780 180 L795 80 L810 180" />
            <path d="M785 145 L805 145" />
            <path d="M788 115 L802 115" />
            <path d="M775 95 L815 95" />
            <path d="M780 120 L810 120" />
          </g>
          {/* City skyline wireframe */}
          <g fill="none" stroke={cfg.accentColor} strokeWidth="0.8" opacity="0.6">
            <rect x="830" y="110" width="18" height="70" />
            <rect x="855" y="90" width="22" height="90" />
            <rect x="885" y="120" width="16" height="60" />
            <rect x="910" y="85" width="26" height="95" />
            <rect x="945" y="115" width="20" height="65" />
            <rect x="970" y="100" width="24" height="80" />
          </g>
        </svg>
      </div>

      {/* Main Content Row - Compact and Responsive */}
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
        
        {/* LEFT SECTION: Animated Concentric HUD Reactor Rings & 3D Shield */}
        <div className="flex items-center gap-3 sm:gap-4 w-full md:w-auto justify-center sm:justify-start">
          
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 flex items-center justify-center">
            {/* Ambient Aura */}
            <div
              className="absolute inset-0 rounded-full blur-md opacity-60 animate-hud-pulse"
              style={{
                background: `radial-gradient(circle, ${cfg.accentColor} 0%, transparent 70%)`,
              }}
            />

            {/* Outermost Ring (Counter-Clockwise Dashed Ring) */}
            <div
              className="absolute inset-0 rounded-full border border-dashed animate-hud-spin-reverse opacity-70"
              style={{ borderColor: cfg.accentColor }}
            />

            {/* Orbiting Satellites */}
            <div className="absolute inset-0.5 rounded-full animate-hud-spin">
              <div
                className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full shadow-[0_0_6px_#ffffff]"
                style={{ backgroundColor: cfg.accentColor }}
              />
              <div
                className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full shadow-[0_0_6px_#ffffff]"
                style={{ backgroundColor: cfg.accentColor }}
              />
            </div>

            {/* Inner Glow Arcs */}
            <div
              className="absolute inset-2 rounded-full border-2 border-transparent animate-hud-spin-reverse opacity-90"
              style={{
                borderLeftColor: cfg.accentColor,
                borderRightColor: cfg.accentColor,
                filter: `drop-shadow(0 0 4px ${cfg.accentColor})`,
              }}
            />

            {/* Center 3D Futuristic Shield Emblem */}
            <div
              className="relative w-9 h-11 sm:w-11 sm:h-13 rounded-lg flex items-center justify-center shadow-lg"
              style={{
                background: `linear-gradient(145deg, #091e17 0%, #030806 100%)`,
                border: `1.2px solid ${cfg.accentColor}`,
                boxShadow: `0 0 12px ${cfg.accentGlow}, inset 0 0 8px ${cfg.accentGlow}`,
                clipPath: 'polygon(50% 0%, 100% 18%, 100% 82%, 50% 100%, 0% 82%, 0% 18%)',
              }}
            >
              <div
                className="absolute inset-0.5 opacity-80"
                style={{
                  background: `linear-gradient(135deg, ${cfg.accentColor} 0%, transparent 60%)`,
                  clipPath: 'polygon(50% 0%, 100% 18%, 100% 82%, 50% 100%, 0% 82%, 0% 18%)',
                }}
              />
              <div className="relative z-10 animate-hud-pulse">
                {cfg.shieldIcon}
              </div>
            </div>
          </div>

          {/* CENTER SECTION: Header Badge, Display Title, Cyber Spark Line & Indicators */}
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left min-w-0">
            
            {/* Top Badge Pill */}
            <div className="flex items-center gap-2">
              <div
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border shadow-sm ${cfg.badgeBg}`}
              >
                {cfg.badgeIcon}
                <span>{cfg.badgeText}</span>
              </div>
            </div>

            {/* Hero Heading */}
            <h1 className="text-lg sm:text-2xl font-black tracking-tight uppercase text-white font-sans flex items-center gap-1.5 sm:gap-2 justify-center sm:justify-start leading-tight mt-0.5">
              <span>{cfg.titleMain}</span>
              <span className={cfg.titleColor}>{cfg.titleHighlight}</span>
            </h1>

            {/* Compact Glowing Cyber Divider */}
            <div className="relative w-full my-1 sm:my-1.5 flex items-center">
              <div
                className="h-[1px] w-full"
                style={{
                  background: `linear-gradient(90deg, ${cfg.accentColor} 0%, rgba(255,255,255,0.6) 50%, ${cfg.accentColor} 100%)`,
                  opacity: 0.45,
                }}
              />
              <div
                className="absolute left-1/2 sm:left-8 -translate-x-1/2 w-1.5 h-1.5 rounded-full shadow-[0_0_6px_#ffffff]"
                style={{
                  backgroundColor: '#ffffff',
                  boxShadow: `0 0 8px ${cfg.accentColor}`,
                }}
              />
            </div>

            {/* 3 Compact Circular HUD Indicators */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center sm:justify-start">
              
              {/* Indicator 1: Réseau */}
              <div className="flex items-center gap-1.5 bg-slate-900/80 border border-white/10 px-2 py-0.5 rounded-lg backdrop-blur-sm">
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 border"
                  style={{
                    backgroundColor: `${cfg.accentColor}18`,
                    borderColor: `${cfg.accentColor}40`,
                  }}
                >
                  <Activity className="w-2.5 h-2.5" style={{ color: cfg.accentColor }} />
                </div>
                <div className="text-left font-mono leading-none">
                  <span className="text-[9px] text-slate-400 font-semibold mr-1">{cfg.indicatorNet.label}:</span>
                  <span className={`text-[10px] font-black tracking-wider ${cfg.indicatorNet.color}`}>
                    {cfg.indicatorNet.value}
                  </span>
                </div>
              </div>

              {/* Indicator 2: Tension */}
              <div className="flex items-center gap-1.5 bg-slate-900/80 border border-white/10 px-2 py-0.5 rounded-lg backdrop-blur-sm">
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 border"
                  style={{
                    backgroundColor: `${cfg.accentColor}18`,
                    borderColor: `${cfg.accentColor}40`,
                  }}
                >
                  <Zap className="w-2.5 h-2.5" style={{ color: cfg.accentColor }} />
                </div>
                <div className="text-left font-mono leading-none">
                  <span className="text-[9px] text-slate-400 font-semibold mr-1">{cfg.indicatorVolt.label}:</span>
                  <span className={`text-[10px] font-black tracking-wider ${cfg.indicatorVolt.color}`}>
                    {cfg.indicatorVolt.value}
                  </span>
                </div>
              </div>

              {/* Indicator 3: Système */}
              <div className="flex items-center gap-1.5 bg-slate-900/80 border border-white/10 px-2 py-0.5 rounded-lg backdrop-blur-sm">
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 border"
                  style={{
                    backgroundColor: `${cfg.accentColor}18`,
                    borderColor: `${cfg.accentColor}40`,
                  }}
                >
                  <Shield className="w-2.5 h-2.5" style={{ color: cfg.accentColor }} />
                </div>
                <div className="text-left font-mono leading-none">
                  <span className="text-[9px] text-slate-400 font-semibold mr-1">{cfg.indicatorSys.label}:</span>
                  <span className={`text-[10px] font-black tracking-wider ${cfg.indicatorSys.color}`}>
                    {cfg.indicatorSys.value}
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* RIGHT SECTION: Dedicated Compact Cyber Glass Relais Card */}
        <div className="w-full md:w-auto flex justify-center md:justify-end shrink-0">
          <div
            className={`w-full sm:w-44 rounded-xl sm:rounded-2xl border px-3 py-2 sm:px-4 sm:py-2.5 flex flex-row md:flex-col items-center justify-between md:justify-center text-center backdrop-blur-xl transition-all duration-300 ${cfg.relayBoxBorder}`}
            style={{
              background: `linear-gradient(160deg, rgba(15,23,42,0.92) 0%, rgba(2,6,23,0.98) 100%)`,
            }}
          >
            <div className="flex items-center gap-2 md:flex-col">
              {/* Relay Diagram Ring */}
              <div className="relative w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center shrink-0">
                <div
                  className="absolute inset-0 rounded-full border opacity-80 animate-hud-pulse"
                  style={{
                    borderColor: cfg.accentColor,
                    boxShadow: `0 0 8px ${cfg.accentColor}`,
                  }}
                />
                <svg
                  viewBox="0 0 32 32"
                  className="w-4 h-4 sm:w-5 sm:h-5"
                  fill="none"
                  stroke={cfg.accentColor}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ filter: `drop-shadow(0 0 4px ${cfg.accentColor})` }}
                >
                  <rect x="8" y="6" width="10" height="6" rx="1.5" />
                  <path d="M22 10 L26 6 M26 6 L22 6 M26 6 L26 10" />
                  <rect x="6" y="20" width="8" height="6" rx="1.5" />
                  <path d="M13 12 V16 H22 V20" />
                </svg>
              </div>

              {/* Title */}
              <div
                className={`text-xs sm:text-sm font-black uppercase font-mono tracking-wide ${cfg.relayColor}`}
                style={{
                  filter: `drop-shadow(0 0 6px ${cfg.accentColor})`,
                }}
              >
                {cfg.relayTitle}
              </div>
            </div>

            {/* Separator */}
            <div className="hidden md:flex relative w-3/4 my-1 items-center justify-center">
              <div
                className="h-[1px] w-full"
                style={{
                  background: `linear-gradient(90deg, transparent, ${cfg.accentColor}, transparent)`,
                  opacity: 0.5,
                }}
              />
            </div>

            {/* Stylized Protection Active / Relay State Badge */}
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 mt-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border shadow-sm transition-all ${
                !isRelaisOff && !isCoupure && niveau === 'NORMAL'
                  ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                  : isCoupure
                  ? 'bg-sky-500/15 border-sky-400/40 text-sky-300'
                  : niveau === 'DANGER'
                  ? 'bg-rose-500/20 border-rose-400/50 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                  : 'bg-amber-500/15 border-amber-400/40 text-amber-300'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  !isRelaisOff && !isCoupure && niveau === 'NORMAL'
                    ? 'bg-emerald-400 shadow-[0_0_6px_#10b981] animate-pulse'
                    : isCoupure
                    ? 'bg-sky-400'
                    : niveau === 'DANGER'
                    ? 'bg-rose-400 shadow-[0_0_6px_#f43f5e] animate-ping'
                    : 'bg-amber-400 shadow-[0_0_6px_#f59e0b]'
                }`}
              />
              <span className="truncate">{cfg.relaySub}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
