import React from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  ZapOff,
  Power,
} from 'lucide-react';
import { NiveauStatus } from '../types';

interface StatusBarProps {
  niveau: NiveauStatus;
  message: string;
  relais?: boolean;
  tension?: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  niveau,
  message,
  relais = true,
  tension = 230,
}) => {
  const isCoupure = tension === 0 || (message && message.toLowerCase().includes('coupure'));
  const isRelaisOff = !relais;

  const getStyle = () => {
    // 1. Coupure secteur (0V)
    if (isCoupure) {
      return {
        containerClass: 'bg-rose-950/60 border-rose-500/90 text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.3)]',
        badgeClass: 'bg-rose-500/30 text-rose-300 border-rose-500/80 font-black',
        icon: <ZapOff className="w-5 h-5 text-rose-400 shrink-0 animate-bounce" />,
        title: 'COUPURE DE TENSION SECTEUR (0V)',
        badgeText: 'COUPURE',
        relayTag: (
          <div className="flex items-center gap-1.5 text-rose-400 text-xs font-bold shrink-0 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>Relais OFF</span>
          </div>
        ),
        subtext: message || 'Absence de tension secteur détectée. Aucun courant mesuré.',
      };
    }

    // 2. Danger (Surtension, Surcharge)
    if (niveau === 'DANGER') {
      return {
        containerClass: 'bg-rose-950/50 border-rose-500/80 text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.25)]',
        badgeClass: 'bg-rose-500/30 text-rose-300 border-rose-500/70 font-black',
        icon: <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 animate-bounce" />,
        title: 'ALERTE CRITIQUE DE SÉCURITÉ',
        badgeText: 'DANGER',
        relayTag: isRelaisOff ? (
          <div className="flex items-center gap-1.5 text-rose-300 text-xs font-bold shrink-0 bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/40">
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>Relais DISJONCTÉ (OFF)</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-amber-300 text-xs font-bold shrink-0 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Relais ACTIF (ATTENTION)</span>
          </div>
        ),
        subtext: message || 'Anomalie majeure sur le réseau. Disjonction de sécurité active.',
      };
    }

    // 3. Avertissement / Attention
    if (niveau === 'ATTENTION') {
      return {
        containerClass: 'bg-amber-950/50 border-amber-500/70 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.2)]',
        badgeClass: 'bg-amber-500/25 text-amber-300 border-amber-500/60 font-black',
        icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />,
        title: 'AVERTISSEMENT RÉSEAU',
        badgeText: 'AVERTISSEMENT',
        relayTag: isRelaisOff ? (
          <div className="flex items-center gap-1.5 text-amber-300 text-xs font-bold shrink-0 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40">
            <Power className="w-3.5 h-3.5 text-amber-400" />
            <span>Relais OFF</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold shrink-0 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/40">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Relais ON</span>
          </div>
        ),
        subtext: message || 'Fluctuation de tension ou charge élevée. Surveillance renforcée.',
      };
    }

    // 4. Relais OFF Manuel en état Normal
    if (isRelaisOff) {
      return {
        containerClass: 'bg-slate-900/90 border-amber-500/60 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.15)]',
        badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold',
        icon: <Power className="w-5 h-5 text-amber-400 shrink-0" />,
        title: 'ALIMENTATION COUPÉE (RELAIS OFF)',
        badgeText: 'RELAIS OFF',
        relayTag: (
          <div className="flex items-center gap-1.5 text-amber-300 text-xs font-bold shrink-0 bg-amber-500/20 px-2.5 py-0.5 rounded border border-amber-500/40">
            <XCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Relais DÉCONNECTÉ</span>
          </div>
        ),
        subtext: message || 'Le relais de puissance est ouvert. La charge est hors tension.',
      };
    }

    // 5. Normal / Stable
    return {
      containerClass: 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.1)]',
      badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 font-bold',
      icon: <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />,
      title: 'RÉSEAU STABLE & CONFORME',
      badgeText: 'NORMAL',
      relayTag: (
        <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold shrink-0 bg-emerald-500/20 px-2.5 py-0.5 rounded border border-emerald-500/40">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Relais OK (ON)</span>
        </div>
      ),
      subtext: message || 'Tension et courant dans les plages nominales de sécurité.',
    };
  };

  const style = getStyle();

  return (
    <div className={`p-4 sm:p-5 rounded-2xl mb-5 border transition-all duration-300 relative overflow-hidden backdrop-blur-md flex flex-wrap items-center justify-between gap-3 font-mono ${style.containerClass}`}>
      {/* Background ambient light strip */}
      <div className="absolute top-0 right-0 bottom-0 w-32 bg-gradient-to-l from-white/5 to-transparent pointer-events-none" />

      <div className="flex items-center gap-3.5 min-w-0 z-10 w-full sm:w-auto">
        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-white/10 shrink-0">
          {style.icon}
        </div>

        <div className="flex items-center gap-2.5 min-w-0 flex-wrap text-xs sm:text-sm">
          <span className={`px-2.5 py-0.5 rounded-md text-[11px] uppercase tracking-widest border shrink-0 ${style.badgeClass}`}>
            {style.badgeText}
          </span>
          <span className="font-extrabold text-slate-100 uppercase tracking-wide">
            {style.title}
          </span>
          {style.relayTag}
          <span className="text-slate-500 hidden sm:inline">•</span>
          <span className="text-slate-300 text-xs hidden md:inline">
            {style.subtext}
          </span>
        </div>
      </div>
    </div>
  );
};


