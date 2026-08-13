import React, { useState, useEffect } from 'react';
import { Sliders, Volume2, Save, Check } from 'lucide-react';

export interface SystemSettings {
  minVoltage: number;
  maxVoltage: number;
  minCurrent: number;
  maxCurrent: number;
  soundAlerts: boolean;
}

interface SettingsTabProps {
  settings: SystemSettings;
  onUpdateSettings: (newSettings: SystemSettings) => void;
  showToast: (msg: string) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  onUpdateSettings,
  showToast,
}) => {
  const [minVoltage, setMinVoltage] = useState<number>(settings.minVoltage);
  const [maxVoltage, setMaxVoltage] = useState<number>(settings.maxVoltage);
  const [minCurrent, setMinCurrent] = useState<number>(settings.minCurrent);
  const [maxCurrent, setMaxCurrent] = useState<number>(settings.maxCurrent);
  const [soundAlerts, setSoundAlerts] = useState<boolean>(settings.soundAlerts);
  const [saved, setSaved] = useState<boolean>(false);

  useEffect(() => {
    setMinVoltage(settings.minVoltage);
    setMaxVoltage(settings.maxVoltage);
    setMinCurrent(settings.minCurrent);
    setMaxCurrent(settings.maxCurrent);
    setSoundAlerts(settings.soundAlerts);
  }, [
    settings.minVoltage,
    settings.maxVoltage,
    settings.minCurrent,
    settings.maxCurrent,
    settings.soundAlerts,
  ]);

  const handleSave = () => {
    const updated: SystemSettings = {
      minVoltage,
      maxVoltage,
      minCurrent,
      maxCurrent,
      soundAlerts,
    };
    onUpdateSettings(updated);
    setSaved(true);
    showToast('Paramètres enregistrés et synchronisés');
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4 animate-fadeIn max-w-3xl mx-auto">
      <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-800 bg-slate-950/80">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800 mb-3.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-slate-100">
              SEUILS DE SÉCURITÉ & PROTECTION
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
                  <span>Tension Min</span>
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
                  <span>Tension Max</span>
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

              {/* Min Current Slider */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-slate-300 text-[11px]">
                  <span>Courant Min</span>
                  <span className="font-bold text-amber-400 text-xs">{minCurrent} A</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={minCurrent}
                  onChange={(e) => setMinCurrent(Math.min(Number(e.target.value), maxCurrent - 1))}
                  className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>

              {/* Max Current Slider */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-slate-300 text-[11px]">
                  <span>Courant Max</span>
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
              <span>Alertes sonores en cas d'incident</span>
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
            <span>{saved ? 'Enregistré' : 'Enregistrer'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

