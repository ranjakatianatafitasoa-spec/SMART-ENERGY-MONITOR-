import React, { useState, useEffect } from 'react';
import { Sliders, Volume2, Save, Check, Wifi, Radio, Globe, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

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

  const handleTestConnection = async () => {
    setTestingPing(true);
    setPingResult(null);

    const targetUrl =
      connectionMode === 'ap'
        ? 'http://192.168.4.1/ping'
        : connectionMode === 'custom' && esp32Ip
        ? `http://${esp32Ip.replace(/^http:\/\//, '')}/ping`
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
          message: `Liaison active (${elapsed} ms)`,
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
      showToast('Échec de communication avec l\'ESP32', 'danger');
    } finally {
      setTestingPing(false);
    }
  };

  const handleSave = () => {
    // Basic validation
    if (minVoltage >= maxVoltage) {
      showToast('La tension minimale doit être inférieure à la tension maximale', 'warning');
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
    showToast('Paramètres enregistrés et appliqués', 'success');
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4 animate-fadeIn max-w-3xl mx-auto font-mono text-xs">
      {/* 1. Mode de Communication */}
      <div className="glass-panel p-4 rounded-2xl border border-cyan-500/30 bg-slate-950/85 shadow-lg space-y-3">
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-100">
              LIAISON WI-FI & ESP32
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleTestConnection}
              disabled={testingPing}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${testingPing ? 'animate-spin' : ''}`} />
              <span>{testingPing ? 'Test...' : 'Tester'}</span>
            </button>
            {pingResult && (
              <span className={`text-[11px] font-bold flex items-center gap-1 ${pingResult.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
                {pingResult.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                <span>{pingResult.message}</span>
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Mode Soft-AP */}
          <div
            onClick={() => {
              setConnectionMode('ap');
              setEsp32Ip('192.168.4.1');
            }}
            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
              connectionMode === 'ap'
                ? 'bg-cyan-950/40 border-cyan-400 text-cyan-300 shadow-sm'
                : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Radio className={`w-4 h-4 ${connectionMode === 'ap' ? 'text-cyan-400' : 'text-slate-400'}`} />
              <span className="font-bold">Point d'Accès Direct (192.168.4.1)</span>
            </div>
            {connectionMode === 'ap' && <Check className="w-4 h-4 text-cyan-400" />}
          </div>

          {/* Mode IP Personnalisée */}
          <div
            onClick={() => setConnectionMode('custom')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              connectionMode === 'custom'
                ? 'bg-cyan-950/40 border-cyan-400 text-cyan-300 shadow-sm'
                : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Globe className={`w-4 h-4 ${connectionMode === 'custom' ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span className="font-bold">Adresse IP / Réseau Local</span>
              </div>
              {connectionMode === 'custom' && <Check className="w-4 h-4 text-cyan-400" />}
            </div>
            {connectionMode === 'custom' && (
              <input
                type="text"
                value={esp32Ip}
                onChange={(e) => setEsp32Ip(e.target.value)}
                placeholder="192.168.1.50"
                className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-cyan-300 text-xs focus:outline-none focus:border-cyan-400"
              />
            )}
          </div>
        </div>
      </div>

      {/* 2. Seuils Électriques & Déclenchement Relais */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-slate-950/80 space-y-3.5">
        <div className="flex items-center gap-2 pb-2.5 border-b border-slate-800">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-100">
            SEUILS DE SÉCURITÉ & COUPURE AUTOMATIQUE
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Tension Min */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-[11px]">Tension Min (Sous-tension)</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="120"
                  max="230"
                  value={minVoltage}
                  onChange={(e) => setMinVoltage(Number(e.target.value))}
                  className="w-16 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-cyan-300 font-bold text-xs text-right focus:outline-none focus:border-cyan-400"
                />
                <span className="text-[11px] text-slate-400">V</span>
              </div>
            </div>
            <input
              type="range"
              min="140"
              max="225"
              value={minVoltage}
              onChange={(e) => setMinVoltage(Math.min(Number(e.target.value), maxVoltage - 5))}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>

          {/* Tension Max */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-[11px]">Tension Max (Surtension)</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="230"
                  max="300"
                  value={maxVoltage}
                  onChange={(e) => setMaxVoltage(Number(e.target.value))}
                  className="w-16 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-cyan-300 font-bold text-xs text-right focus:outline-none focus:border-cyan-400"
                />
                <span className="text-[11px] text-slate-400">V</span>
              </div>
            </div>
            <input
              type="range"
              min="230"
              max="290"
              value={maxVoltage}
              onChange={(e) => setMaxVoltage(Math.max(Number(e.target.value), minVoltage + 5))}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>

          {/* Courant Max */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-[11px]">Courant Max (Surcharge)</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="1"
                  max="50"
                  step="0.5"
                  value={maxCurrent}
                  onChange={(e) => setMaxCurrent(Number(e.target.value))}
                  className="w-16 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-amber-300 font-bold text-xs text-right focus:outline-none focus:border-amber-400"
                />
                <span className="text-[11px] text-slate-400">A</span>
              </div>
            </div>
            <input
              type="range"
              min="1"
              max="35"
              step="0.5"
              value={maxCurrent}
              onChange={(e) => setMaxCurrent(Math.max(Number(e.target.value), minCurrent + 0.5))}
              className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>

          {/* Alertes Sonores */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-300">
              <Volume2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-[11px]">Bip Sonore d'Alerte</span>
            </div>
            <button
              onClick={() => setSoundAlerts(!soundAlerts)}
              className={`w-10 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer shrink-0 ${
                soundAlerts ? 'bg-cyan-500' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                  soundAlerts ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Bouton Enregistrer */}
        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
          >
            {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saved ? 'Enregistré' : 'Enregistrer'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
