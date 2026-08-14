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
  showToast: (msg: string, type?: 'success' | 'danger' | 'info') => void;
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
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(targetUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      const elapsed = Date.now() - startTime;
      if (res.ok) {
        setPingResult({
          ok: true,
          message: `Connecté avec succès ! Réponse en ${elapsed} ms.`,
        });
        showToast(`ESP32 accessible (${elapsed}ms)`, 'success');
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch {
      setPingResult({
        ok: false,
        message:
          connectionMode === 'ap'
            ? 'Impossible de joindre 192.168.4.1. Vérifiez que votre smartphone est connecté au Wi-Fi "SMART_ENERGY_MONITOR".'
            : `Échec de connexion vers ${targetUrl}. Vérifiez l'adresse IP.`,
      });
      showToast('Échec de communication avec l\'ESP32', 'danger');
    } finally {
      setTestingPing(false);
    }
  };

  const handleSave = () => {
    const updated: SystemSettings = {
      minVoltage,
      maxVoltage,
      minCurrent,
      maxCurrent,
      soundAlerts,
      connectionMode,
      esp32Ip: connectionMode === 'ap' ? '192.168.4.1' : esp32Ip,
    };
    onUpdateSettings(updated);
    setSaved(true);
    showToast('Paramètres & Mode Wi-Fi enregistrés', 'success');
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4 animate-fadeIn max-w-3xl mx-auto">
      {/* 1. Mode de Connexion Wi-Fi & ESP32 */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-cyan-500/30 bg-slate-950/85 shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Wifi className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-slate-100">
                MODE DE COMMUNICATION WI-FI & ESP32
              </h2>
            </div>
          </div>
        </div>

        <div className="space-y-3 font-mono text-xs">
          {/* Options de Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Option A: Point d'accès Direct (Recommandé) */}
            <div
              onClick={() => {
                setConnectionMode('ap');
                setEsp32Ip('192.168.4.1');
              }}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                connectionMode === 'ap'
                  ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                  : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Radio className={`w-4 h-4 ${connectionMode === 'ap' ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span className={`font-bold text-xs ${connectionMode === 'ap' ? 'text-cyan-300' : 'text-slate-200'}`}>
                  Point d'Accès Wi-Fi Direct (Recommandé)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Connectez votre téléphone au réseau Wi-Fi créé par l'ESP32 :
                <br />
                <strong className="text-cyan-300">SSID : SMART_ENERGY_MONITOR</strong>
                <br />
                <strong className="text-slate-300">Mot de passe : 12345678</strong> (IP : 192.168.4.1)
              </p>
            </div>

            {/* Option B: Serveur / Réseau Local */}
            <div
              onClick={() => setConnectionMode('custom')}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                connectionMode === 'custom'
                  ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                  : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Globe className={`w-4 h-4 ${connectionMode === 'custom' ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span className={`font-bold text-xs ${connectionMode === 'custom' ? 'text-cyan-300' : 'text-slate-200'}`}>
                  Adresse IP Locale Personnalisée
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Si l'ESP32 est connecté sur votre réseau local/Box Internet :
              </p>
              <input
                type="text"
                value={esp32Ip}
                onChange={(e) => setEsp32Ip(e.target.value)}
                placeholder="Ex: 192.168.1.50"
                className="mt-2 w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-cyan-300 text-xs focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* Test de connexion */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
            <button
              onClick={handleTestConnection}
              disabled={testingPing}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingPing ? 'animate-spin' : ''}`} />
              <span>{testingPing ? 'Test en cours...' : 'Tester la connexion ESP32'}</span>
            </button>

            {pingResult && (
              <div
                className={`flex items-center gap-1.5 text-xs font-bold ${
                  pingResult.ok ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {pingResult.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                <span>{pingResult.message}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Seuils de Sécurité & Protection */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-800 bg-slate-950/80">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800 mb-3.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-slate-100">
              SEUILS DE SÉCURITÉ & DÉCLENCHEMENT RELAIS
            </h2>
          </div>
        </div>

        <div className="space-y-3.5 font-mono text-xs">
          {/* Grid with Tension and Courant side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Tension Min & Max Section */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
              <span className="font-bold text-slate-200 uppercase tracking-wider block border-b border-slate-800/80 pb-1 text-[10px] text-cyan-400">
                PLAGE DE TENSION (V)
              </span>

              {/* Min Voltage Slider */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-slate-300 text-[11px]">
                  <span>Tension Min (Sous-tension)</span>
                  <span className="font-bold text-cyan-400 text-xs">{minVoltage} V</span>
                </div>
                <input
                  type="range"
                  min="150"
                  max="230"
                  value={minVoltage}
                  onChange={(e) => setMinVoltage(Math.min(Number(e.target.value), maxVoltage - 5))}
                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>

              {/* Max Voltage Slider */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-slate-300 text-[11px]">
                  <span>Tension Max (Surtension)</span>
                  <span className="font-bold text-cyan-400 text-xs">{maxVoltage} V</span>
                </div>
                <input
                  type="range"
                  min="230"
                  max="300"
                  value={maxVoltage}
                  onChange={(e) => setMaxVoltage(Math.max(Number(e.target.value), minVoltage + 5))}
                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>
            </div>

            {/* Courant Min & Max Section */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
              <span className="font-bold text-slate-200 uppercase tracking-wider block border-b border-slate-800/80 pb-1 text-[10px] text-amber-400">
                PLAGE DE COURANT (A)
              </span>

              {/* Max Current Slider */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-slate-300 text-[11px]">
                  <span>Courant Max (Surcharge)</span>
                  <span className="font-bold text-amber-400 text-xs">{maxCurrent} A</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={maxCurrent}
                  onChange={(e) => setMaxCurrent(Math.max(Number(e.target.value), minCurrent + 1))}
                  className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Sound Alerts Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center gap-2 text-slate-300 text-xs">
              <Volume2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Alertes sonores & Notifications en cas d'anomalie</span>
            </div>
            <button
              onClick={() => setSoundAlerts(!soundAlerts)}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer shrink-0 ${
                soundAlerts ? 'bg-cyan-500' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-slate-950 transition-transform ${
                  soundAlerts ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-slate-800">
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-mono font-bold flex items-center gap-2 cursor-pointer shadow-md transition-all"
          >
            {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saved ? 'Enregistré' : 'Enregistrer les Paramètres'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
