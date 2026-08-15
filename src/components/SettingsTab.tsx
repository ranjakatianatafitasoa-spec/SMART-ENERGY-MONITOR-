import React, { useState, useEffect } from 'react';
import { Sliders, Volume2, Save, Check, Wifi, Radio, Globe, RefreshCw, CheckCircle2, XCircle, BellRing, Bell, Smartphone } from 'lucide-react';
import { nativeService } from '../services/nativeService';

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
  const [connectionMode, setConnectionMode] = useState<'ap' | 'server' | 'custom'>(settings.connectionMode || 'ap');
  const [esp32Ip, setEsp32Ip] = useState<string>(settings.esp32Ip || '192.168.4.1');
  const [saved, setSaved] = useState<boolean>(false);

  // Ping test state
  const [testingPing, setTestingPing] = useState<boolean>(false);
  const [pingResult, setPingResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    setMinVoltage(settings.minVoltage || 185);
    setMaxVoltage(settings.maxVoltage || 253);
    setMinCurrent(settings.minCurrent || 0);
    setMaxCurrent(settings.maxCurrent || 10);
    setSoundAlerts(settings.soundAlerts !== false);
    setConnectionMode(settings.connectionMode || 'ap');
    setEsp32Ip(settings.esp32Ip || (settings.connectionMode === 'server' ? '' : '192.168.4.1'));
  }, [
    settings.minVoltage,
    settings.maxVoltage,
    settings.minCurrent,
    settings.maxCurrent,
    settings.soundAlerts,
    settings.connectionMode,
    settings.esp32Ip,
  ]);

  const handleTestSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
      showToast('Test sonore émis avec succès', 'info');
    } catch {
      showToast('Audio non disponible', 'warning');
    }
  };

  const applyPreset = (minV: number, maxV: number, maxI: number, label: string) => {
    setMinVoltage(minV);
    setMaxVoltage(maxV);
    setMaxCurrent(maxI);
    showToast(`Préréglage appliqué : ${label}`, 'info');
  };

  const handleTestConnection = async () => {
    setTestingPing(true);
    setPingResult(null);

    const targetUrl =
      connectionMode === 'ap'
        ? 'http://192.168.4.1/data'
        : connectionMode === 'custom' && esp32Ip
        ? `http://${esp32Ip.replace(/^http:\/\//, '')}/data`
        : '/api/data';

    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(targetUrl, { signal: controller.signal, mode: 'cors' });
      clearTimeout(timeoutId);

      const elapsed = Date.now() - startTime;
      if (res.ok) {
        setPingResult({
          ok: true,
          message: `Connecté (${elapsed} ms)`,
        });
        showToast(`ESP32 accessible (${elapsed}ms)`, 'success');
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch {
      // Test server API as backup
      try {
        const res2 = await fetch('/api/data');
        if (res2.ok) {
          const d = await res2.json();
          setPingResult({
            ok: true,
            message: d.esp32Connected ? 'ESP32 connecté au serveur' : 'Serveur local actif',
          });
          showToast(d.esp32Connected ? 'ESP32 connecté' : 'Serveur actif', 'success');
          return;
        }
      } catch {
        // Fallthrough
      }

      setPingResult({
        ok: false,
        message: 'Non joignable',
      });
      showToast('Module ESP32 non joignable. Vérifiez le Wi-Fi.', 'danger');
    } finally {
      setTestingPing(false);
    }
  };

  const handleSave = () => {
    // Validation
    if (minVoltage >= maxVoltage) {
      showToast('La tension minimale doit être inférieure à la tension maximale', 'warning');
      return;
    }
    if (minVoltage < 100 || maxVoltage > 350) {
      showToast('Plage de tension non valide', 'warning');
      return;
    }
    if (maxCurrent <= 0) {
      showToast('Le courant maximum doit être supérieur à 0 A', 'warning');
      return;
    }

    const updated: SystemSettings = {
      minVoltage: Number(minVoltage),
      maxVoltage: Number(maxVoltage),
      minCurrent: Number(minCurrent),
      maxCurrent: Number(maxCurrent),
      soundAlerts,
      connectionMode,
      esp32Ip: connectionMode === 'ap' ? '192.168.4.1' : esp32Ip,
    };

    onUpdateSettings(updated);
    setSaved(true);
    showToast(`Seuils enregistrés : ${minVoltage}V - ${maxVoltage}V | ${maxCurrent}A`, 'success');
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-4 sm:space-y-5 animate-fadeIn w-full max-w-5xl mx-auto font-mono text-xs sm:text-sm">
      {/* 1. Mode de Communication */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-cyan-500/30 bg-slate-950/85 shadow-lg space-y-3.5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Wifi className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-100">
              LIAISON WI-FI & ESP32
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleTestConnection}
              disabled={testingPing}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 text-[11px] sm:text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingPing ? 'animate-spin' : ''}`} />
              <span>{testingPing ? 'Test...' : 'Tester'}</span>
            </button>
            {pingResult && (
              <span className={`text-[11px] sm:text-xs font-bold flex items-center gap-1 ${pingResult.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
                {pingResult.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                <span>{pingResult.message}</span>
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Mode Soft-AP */}
          <div
            onClick={() => {
              setConnectionMode('ap');
              setEsp32Ip('192.168.4.1');
            }}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
              connectionMode === 'ap'
                ? 'bg-cyan-950/40 border-cyan-400 text-cyan-300 shadow-sm'
                : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Radio className={`w-4 h-4 ${connectionMode === 'ap' ? 'text-cyan-400' : 'text-slate-400'}`} />
              <div>
                <span className="font-bold text-xs sm:text-sm block">Point d'Accès ESP32</span>
                <span className="text-[10px] text-cyan-400/80">IP par défaut: 192.168.4.1</span>
              </div>
            </div>
            {connectionMode === 'ap' && <Check className="w-4 h-4 text-cyan-400" />}
          </div>

          {/* Mode IP Personnalisée */}
          <div
            onClick={() => setConnectionMode('custom')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              connectionMode === 'custom'
                ? 'bg-cyan-950/40 border-cyan-400 text-cyan-300 shadow-sm'
                : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <Globe className={`w-4 h-4 ${connectionMode === 'custom' ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span className="font-bold text-xs sm:text-sm">IP Personnalisée / Box</span>
              </div>
              {connectionMode === 'custom' && <Check className="w-4 h-4 text-cyan-400" />}
            </div>
            {connectionMode === 'custom' && (
              <input
                type="text"
                value={esp32Ip}
                onChange={(e) => setEsp32Ip(e.target.value)}
                placeholder="192.168.1.50"
                className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-cyan-300 text-xs sm:text-sm focus:outline-none focus:border-cyan-400 font-mono"
              />
            )}
          </div>
        </div>
      </div>

      {/* 2. Seuils Électriques & Déclenchement Relais */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-800 bg-slate-950/80 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-100">
              SEUILS DE PROTECTION
            </h2>
          </div>
        </div>

        {/* Presets */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => applyPreset(185, 253, 10, 'Standard')}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-cyan-300 text-xs font-semibold cursor-pointer transition-all active:scale-95"
          >
            Standard
          </button>
          <button
            onClick={() => applyPreset(207, 245, 16, 'Strict')}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-cyan-300 text-xs font-semibold cursor-pointer transition-all active:scale-95"
          >
            Strict
          </button>
          <button
            onClick={() => applyPreset(180, 260, 25, 'Large')}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-cyan-300 text-xs font-semibold cursor-pointer transition-all active:scale-95"
          >
            Large
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Tension Min */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-xs font-semibold">Tension Min</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="120"
                  max="230"
                  value={minVoltage}
                  onChange={(e) => setMinVoltage(Number(e.target.value))}
                  className="w-16 px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-cyan-300 font-bold text-xs sm:text-sm text-right focus:outline-none focus:border-cyan-400"
                />
                <span className="text-xs text-slate-400">V</span>
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
          </div>

          {/* Tension Max */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-xs font-semibold">Tension Max</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="230"
                  max="300"
                  value={maxVoltage}
                  onChange={(e) => setMaxVoltage(Number(e.target.value))}
                  className="w-16 px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-cyan-300 font-bold text-xs sm:text-sm text-right focus:outline-none focus:border-cyan-400"
                />
                <span className="text-xs text-slate-400">V</span>
              </div>
            </div>
            <input
              type="range"
              min="230"
              max="290"
              value={maxVoltage}
              onChange={(e) => setMaxVoltage(Math.max(Number(e.target.value), minVoltage + 5))}
              className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
          </div>

          {/* Courant Max */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-xs font-semibold">Courant Max</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="1"
                  max="50"
                  step="0.5"
                  value={maxCurrent}
                  onChange={(e) => setMaxCurrent(Number(e.target.value))}
                  className="w-16 px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-amber-300 font-bold text-xs sm:text-sm text-right focus:outline-none focus:border-amber-400"
                />
                <span className="text-xs text-slate-400">A</span>
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
          </div>

          {/* Alertes Sonores */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-slate-300">
              <Volume2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-xs font-semibold">Alertes Sonores</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleTestSound}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              >
                <BellRing className="w-3.5 h-3.5" />
                <span>Test</span>
              </button>
              <button
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

          {/* Notifications Système Android */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-slate-300">
              <Smartphone className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <span className="text-xs font-semibold block">Notifications Android</span>
                <span className="text-[10px] text-slate-400">Alertes surtension, coupure & relais</span>
              </div>
            </div>
            <button
              onClick={async () => {
                const granted = await nativeService.requestNotificationPermission();
                if (granted) {
                  await nativeService.sendAlertNotification(
                    'normal',
                    '⚡ TEST SMART ÉNERGIE',
                    'Les notifications Android de sécurité sont opérationnelles !'
                  );
                  showToast('Notification de test envoyée', 'success');
                } else {
                  showToast('Autorisation notifications requise dans Paramètres Android', 'warning');
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-700/50 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Tester notification</span>
            </button>
          </div>
        </div>

        {/* Bouton Enregistrer */}
        <div className="flex justify-end pt-3 border-t border-slate-800">
          <button
            onClick={handleSave}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-900/30 transition-all active:scale-95"
          >
            {saved ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
            <span>{saved ? 'Enregistré' : 'Enregistrer'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
