import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Volume2,
  Save,
  Check,
  BellRing,
  Zap,
  ShieldCheck,
  Activity,
  CheckCircle2,
} from 'lucide-react';

export interface SystemSettings {
  minVoltage: number;
  maxVoltage: number;
  minCurrent: number;
  maxCurrent: number;
  soundAlerts: boolean;
  connectionMode?: 'ap' | 'server' | 'custom';
  esp32Ip?: string;
}

interface SettingsTabProps {
  settings: SystemSettings;
  onUpdateSettings: (newSettings: SystemSettings) => void;
  showToast: (msg: string, type?: 'success' | 'danger' | 'info' | 'warning') => void;
}

interface PresetOption {
  id: 'standard' | 'strict' | 'large';
  name: string;
  minV: number;
  maxV: number;
  maxI: number;
  powerMax: string;
  icon: React.ElementType;
  accentColor: string;
  borderActive: string;
}

const PRESETS: PresetOption[] = [
  {
    id: 'standard',
    name: 'Standard',
    minV: 185,
    maxV: 253,
    maxI: 10,
    powerMax: '2.3 kW',
    icon: Zap,
    accentColor: 'text-cyan-400',
    borderActive: 'border-cyan-400 bg-cyan-950/30 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)]',
  },
  {
    id: 'strict',
    name: 'Strict',
    minV: 207,
    maxV: 245,
    maxI: 16,
    powerMax: '3.7 kW',
    icon: ShieldCheck,
    accentColor: 'text-emerald-400',
    borderActive: 'border-emerald-400 bg-emerald-950/30 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]',
  },
  {
    id: 'large',
    name: 'Large',
    minV: 180,
    maxV: 260,
    maxI: 25,
    powerMax: '5.8 kW',
    icon: Activity,
    accentColor: 'text-amber-400',
    borderActive: 'border-amber-400 bg-amber-950/30 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.15)]',
  },
];

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  onUpdateSettings,
  showToast,
}) => {
  const [minVoltage, setMinVoltage] = useState<number>(settings.minVoltage || 185);
  const [maxVoltage, setMaxVoltage] = useState<number>(settings.maxVoltage || 253);
  const [minCurrent, setMinCurrent] = useState<number>(settings.minCurrent || 0);
  const [maxCurrent, setMaxCurrent] = useState<number>(settings.maxCurrent || 10);
  const [soundAlerts, setSoundAlerts] = useState<boolean>(settings.soundAlerts !== false);
  const [saved, setSaved] = useState<boolean>(false);

  useEffect(() => {
    setMinVoltage(settings.minVoltage || 185);
    setMaxVoltage(settings.maxVoltage || 253);
    setMinCurrent(settings.minCurrent || 0);
    setMaxCurrent(settings.maxCurrent || 10);
    setSoundAlerts(settings.soundAlerts !== false);
  }, [
    settings.minVoltage,
    settings.maxVoltage,
    settings.minCurrent,
    settings.maxCurrent,
    settings.soundAlerts,
  ]);

  const activePresetId = PRESETS.find(
    (p) => p.minV === minVoltage && p.maxV === maxVoltage && p.maxI === maxCurrent
  )?.id;

  const handleTestSound = () => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
      showToast('Bip sonore testé', 'info');
    } catch {
      showToast('Audio non disponible', 'warning');
    }
  };

  const applyPreset = (preset: PresetOption) => {
    setMinVoltage(preset.minV);
    setMaxVoltage(preset.maxV);
    setMaxCurrent(preset.maxI);
    showToast(`Préréglage : ${preset.name} (${preset.minV}-${preset.maxV}V / ${preset.maxI}A)`, 'info');
  };

  const handleSave = () => {
    if (minVoltage >= maxVoltage) {
      showToast('Tension min doit être inférieure à tension max', 'warning');
      return;
    }
    if (minVoltage < 100 || maxVoltage > 350) {
      showToast('Plage de tension non valide (100V - 350V)', 'warning');
      return;
    }
    if (maxCurrent <= 0) {
      showToast('Courant max doit être supérieur à 0 A', 'warning');
      return;
    }

    const updated: SystemSettings = {
      minVoltage: Number(minVoltage),
      maxVoltage: Number(maxVoltage),
      minCurrent: Number(minCurrent),
      maxCurrent: Number(maxCurrent),
      soundAlerts,
      connectionMode: settings.connectionMode || 'ap',
      esp32Ip: settings.esp32Ip || '192.168.4.1',
    };

    onUpdateSettings(updated);
    setSaved(true);
    showToast(`Seuils enregistrés : ${minVoltage}V - ${maxVoltage}V | ${maxCurrent}A`, 'success');
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-4 animate-fadeIn w-full max-w-4xl mx-auto font-mono text-xs sm:text-sm">
      {/* 1. Préréglages Rapides */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-800 bg-slate-950/85 space-y-3">
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-100">
              PRÉRÉGLAGES
            </h2>
          </div>
          {activePresetId && (
            <span className="text-[10px] text-cyan-300 font-bold px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30">
              Actif : {PRESETS.find((p) => p.id === activePresetId)?.name}
            </span>
          )}
        </div>

        {/* 3 Cartes Épurées */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {PRESETS.map((preset) => {
            const Icon = preset.icon;
            const isSelected = activePresetId === preset.id;

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? preset.borderActive
                    : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${preset.accentColor}`} />
                    <span className="font-bold text-sm text-slate-100">{preset.name}</span>
                  </div>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />}
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/60">
                  <span className="font-bold text-cyan-300">{preset.minV}-{preset.maxV}V</span>
                  <span className="font-bold text-amber-300">{preset.maxI}A <span className="text-[10px] text-slate-400 font-normal">({preset.powerMax})</span></span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Seuils Électriques */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-800 bg-slate-950/85 space-y-4">
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-100">
            SEUILS MANUELS
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Tension Min */}
          <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2.5">
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-xs font-bold text-slate-200">Tension Min</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="120"
                  max="230"
                  value={minVoltage}
                  onChange={(e) => setMinVoltage(Number(e.target.value))}
                  className="w-16 px-2 py-0.5 rounded bg-slate-950 border border-cyan-500/30 text-cyan-300 font-bold text-xs sm:text-sm text-right focus:outline-none focus:border-cyan-400"
                />
                <span className="text-xs font-bold text-slate-400">V</span>
              </div>
            </div>
            <input
              type="range"
              min="140"
              max="225"
              value={minVoltage}
              onChange={(e) => setMinVoltage(Math.min(Number(e.target.value), maxVoltage - 5))}
              className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>140 V</span>
              <span className="text-cyan-400 font-bold">{minVoltage} V</span>
              <span>225 V</span>
            </div>
          </div>

          {/* Tension Max */}
          <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2.5">
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-xs font-bold text-slate-200">Tension Max</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="230"
                  max="300"
                  value={maxVoltage}
                  onChange={(e) => setMaxVoltage(Number(e.target.value))}
                  className="w-16 px-2 py-0.5 rounded bg-slate-950 border border-rose-500/30 text-rose-300 font-bold text-xs sm:text-sm text-right focus:outline-none focus:border-rose-400"
                />
                <span className="text-xs font-bold text-slate-400">V</span>
              </div>
            </div>
            <input
              type="range"
              min="230"
              max="290"
              value={maxVoltage}
              onChange={(e) => setMaxVoltage(Math.max(Number(e.target.value), minVoltage + 5))}
              className="w-full accent-rose-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>230 V</span>
              <span className="text-rose-400 font-bold">{maxVoltage} V</span>
              <span>290 V</span>
            </div>
          </div>

          {/* Courant Max */}
          <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2.5">
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-xs font-bold text-slate-200">Courant Max</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="1"
                  max="50"
                  step="0.5"
                  value={maxCurrent}
                  onChange={(e) => setMaxCurrent(Number(e.target.value))}
                  className="w-16 px-2 py-0.5 rounded bg-slate-950 border border-amber-500/30 text-amber-300 font-bold text-xs sm:text-sm text-right focus:outline-none focus:border-amber-400"
                />
                <span className="text-xs font-bold text-slate-400">A</span>
              </div>
            </div>
            <input
              type="range"
              min="1"
              max="35"
              step="0.5"
              value={maxCurrent}
              onChange={(e) => setMaxCurrent(Math.max(Number(e.target.value), minCurrent + 0.5))}
              className="w-full accent-amber-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>1 A</span>
              <span className="text-amber-400 font-bold">{maxCurrent} A (~{Math.round(230 * maxCurrent)}W)</span>
              <span>35 A</span>
            </div>
          </div>

          {/* Alertes Sonores */}
          <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-slate-300">
              <Volume2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-xs font-bold text-slate-200">Alertes Sonores</span>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleTestSound}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all active:scale-95 border border-slate-700"
              >
                <BellRing className="w-3 h-3" />
                <span>Test</span>
              </button>
              <button
                type="button"
                onClick={() => setSoundAlerts(!soundAlerts)}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer shrink-0 ${
                  soundAlerts ? 'bg-cyan-500' : 'bg-slate-800'
                }`}
                aria-label="Activer ou désactiver les alertes sonores"
              >
                <div
                  className={`w-5 h-5 rounded-full bg-slate-950 transition-transform ${
                    soundAlerts ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Bouton Enregistrer */}
        <div className="flex justify-end pt-3 border-t border-slate-800/80">
          <button
            type="button"
            onClick={handleSave}
            className="w-full sm:w-auto px-6 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
          >
            {saved ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
            <span>{saved ? 'Enregistré' : 'Enregistrer'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};



