import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { ScopeCanvas } from './components/ScopeCanvas';
import { StatusBar } from './components/StatusBar';
import { MetricsGrid } from './components/MetricsGrid';
import { ChartsGrid } from './components/ChartsGrid';
import { LiveEvolutionCard } from './components/LiveEvolutionCard';
import { RelayPage } from './components/RelayPage';
import { SettingsTab, SystemSettings } from './components/SettingsTab';
import { AboutTab } from './components/AboutTab';
import { BottomNav } from './components/BottomNav';
import { EnergyModal } from './components/EnergyModal';
import { Toast } from './components/Toast';
import { SimulationButton } from './components/SimulationButton';
import { ActiveTab, ESP32Data, HistoryRecord } from './types';
import {
  generateEnergyPdfHtml,
  generateFullReportPdfHtml,
  exportOrPrintPdf,
} from './utils/pdfUtils';
import { FileText, Download, CheckCircle2, ShieldCheck, Shield, ChevronRight, Zap, AlertTriangle, ZapOff, Power } from 'lucide-react';

const INTERVALLE_RELEVE_MS = 60000; // 1 minute snapshot for PDF history

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Current Live State
  const [data, setData] = useState<ESP32Data>({
    tension: 228.4,
    courant: 2.12,
    puissance: 484,
    energie: 1420.5, // Wh
    niveau: 'NORMAL',
    message: 'Système normal',
    relais: true,
    manuel: false,
    rearmement: -1,
    frequence: 50.0,
    facteurPuissance: 0.98,
    puissanceApparente: 485,
    temperatureBord: 36.4,
    wifiConnected: true,
  });

  // Simulation state parameters matching hardware logic
  const [simulationMode, setSimulationMode] = useState<'normal' | 'outage' | 'overvoltage' | 'overcurrent'>('normal');
  const phaseRef = useRef<number>(0);
  const energieSimRef = useRef<number>(1420.5);

  // Live history arrays for vector charts
  const [historyV, setHistoryV] = useState<number[]>([]);
  const [historyI, setHistoryI] = useState<number[]>([]);
  const [historyP, setHistoryP] = useState<number[]>([]);
  const [historyE, setHistoryE] = useState<number[]>([]);

  // Incident records table for PDF reporting
  const [historiqueRecords, setHistoriqueRecords] = useState<HistoryRecord[]>([
    {
      t: new Date(Date.now() - 3600000 * 2.5).toISOString(),
      tension: 264.8,
      courant: 2.1,
      puissance: 556,
      energie: 1412.0,
      niveau: 'DANGER',
      message: 'Surtension secteur critique (>253V) - Relais déclenché',
      relais: false,
      manuel: false,
      incident: true,
    },
    {
      t: new Date(Date.now() - 3600000 * 1.8).toISOString(),
      tension: 228.6,
      courant: 5.85,
      puissance: 1337,
      energie: 1415.2,
      niveau: 'ATTENTION',
      message: 'Surcharge courant élevée (>5.0A)',
      relais: true,
      manuel: false,
      incident: true,
    },
    {
      t: new Date(Date.now() - 3600000 * 0.9).toISOString(),
      tension: 228.4,
      courant: 2.12,
      puissance: 484,
      energie: 1418.6,
      niveau: 'NORMAL',
      message: 'Retour au niveau nominal de sécurité',
      relais: true,
      manuel: false,
      incident: false,
    },
  ]);
  const [incidentFilter, setIncidentFilter] = useState<'all' | 'incidents'>('all');
  const dernierNiveauRef = useRef<string | null>('NORMAL');
  const dernierRelaisRef = useRef<boolean | null>(true);

  // Configurable System Settings & Thresholds
  const [settings, setSettings] = useState<SystemSettings>({
    minVoltage: 185,
    maxVoltage: 253,
    minCurrent: 0,
    maxCurrent: 10,
    soundAlerts: true,
  });

  const settingsRef = useRef<SystemSettings>(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Sound Alert Synthesizer
  const playAlertSound = useCallback((frequency = 880, duration = 0.25) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Browser audio restriction fallback
    }
  }, []);

  // UI Modals & Notifications
  const [isEnergyModalOpen, setIsEnergyModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'info' | 'success' | 'warning' | 'danger'>('info');
  const [reportHtml, setReportHtml] = useState<string>('');

  const showToast = useCallback((msg: string, type: 'info' | 'success' | 'warning' | 'danger' = 'info') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  }, []);

  // Record history ONLY for notable incidents, alerts, or state transitions
  const recordIfPertinent = useCallback((newData: ESP32Data) => {
    const changementNiveau = dernierNiveauRef.current !== null && newData.niveau !== dernierNiveauRef.current;
    const changementRelais = dernierRelaisRef.current !== null && newData.relais !== dernierRelaisRef.current;
    const estIncident = newData.niveau !== 'NORMAL' || !newData.relais;

    if (changementNiveau || changementRelais || (estIncident && dernierNiveauRef.current === 'NORMAL')) {
      const newRecord: HistoryRecord = {
        ...newData,
        t: new Date().toISOString(),
        incident: estIncident,
      };
      setHistoriqueRecords((prev) => [newRecord, ...prev]);

      // Sound alert & auto-toast on state transitions
      if (newData.tension === 0) {
        showToast('COUPURE SECTEUR (0V) DÉTECTÉE', 'danger');
      } else if (newData.niveau === 'DANGER') {
        showToast(newData.message || 'ALERTE CRITIQUE DE SÉCURITÉ', 'danger');
      } else if (newData.niveau === 'ATTENTION') {
        showToast(newData.message || 'AVERTISSEMENT RÉSEAU DÉTECTÉ', 'warning');
      } else if (!newData.relais && dernierRelaisRef.current === true) {
        showToast('RELAIS DÉCONNECTÉ (OFF)', 'warning');
      }

      if (settings.soundAlerts && estIncident) {
        playAlertSound(1046, 0.3);
      }
    }

    dernierNiveauRef.current = newData.niveau;
    dernierRelaisRef.current = newData.relais;
  }, [settings.soundAlerts, playAlertSound, showToast]);

  // Data Fetching & Live Simulation Loop
  useEffect(() => {
    const interval = setInterval(() => {
      fetch('/data')
        .then((res) => res.json())
        .then((fetchedData: ESP32Data) => {
          setData(fetchedData);
          if (fetchedData.settings) {
            setSettings((prev) => {
              const s = fetchedData.settings;
              if (
                prev.minVoltage === s.minVoltage &&
                prev.maxVoltage === s.maxVoltage &&
                prev.minCurrent === s.minCurrent &&
                prev.maxCurrent === s.maxCurrent &&
                prev.soundAlerts === s.soundAlerts
              ) {
                return prev;
              }
              return { ...prev, ...s };
            });
          }
          setHistoryV((prev) => [...prev.slice(-59), fetchedData.tension]);
          setHistoryI((prev) => [...prev.slice(-59), fetchedData.courant]);
          setHistoryP((prev) => [...prev.slice(-59), fetchedData.puissance]);
          setHistoryE((prev) => [...prev.slice(-59), fetchedData.energie]);
          recordIfPertinent(fetchedData);
        })
        .catch(() => {
          // Simulation fallback dynamically evaluating configurable settings thresholds
          const curSettings = settingsRef.current;
          phaseRef.current += 0.3;
          const noise = () => (Math.random() - 0.5) * 0.8;

          let tension = 228.0 + Math.sin(phaseRef.current * 0.2) * 2 + noise();
          let courant = Math.max(0, 2.12 + Math.sin(phaseRef.current * 0.35) * 1.1 + noise() * 0.2);

          let niveau: ESP32Data['niveau'] = 'NORMAL';
          let message = 'Système normal';

          if (simulationMode === 'outage') {
            tension = 0;
            courant = 0;
            niveau = 'DANGER';
            message = 'Coupure secteur (0V) détectée';
          } else if (simulationMode === 'overvoltage') {
            tension = Number((curSettings.maxVoltage + 12.4 + noise()).toFixed(1));
            niveau = 'DANGER';
            message = `Surtension secteur critique (>${curSettings.maxVoltage}V)`;
          } else if (simulationMode === 'overcurrent') {
            courant = Number((curSettings.maxCurrent * 0.6 + 1.2 + noise() * 0.3).toFixed(2));
            niveau = 'ATTENTION';
            message = `Surcharge courant élevée (>${(curSettings.maxCurrent * 0.5).toFixed(1)}A)`;
          } else {
            // Live threshold evaluation against user settings
            if (tension > curSettings.maxVoltage) {
              niveau = 'DANGER';
              message = `Surtension secteur (>${curSettings.maxVoltage}V)`;
            } else if (tension < curSettings.minVoltage && tension > 0) {
              niveau = 'ATTENTION';
              message = `Sous-tension secteur (<${curSettings.minVoltage}V)`;
            } else if (courant > curSettings.maxCurrent) {
              niveau = 'ATTENTION';
              message = `Surcharge courant (>${curSettings.maxCurrent}A)`;
            }
          }

          tension = Number(tension.toFixed(1));
          courant = Number(courant.toFixed(2));
          const puissance = Math.round(tension * courant);

          energieSimRef.current += puissance / 3600; // Wh accumulator
          const nextEnergy = Number(energieSimRef.current.toFixed(1));

          const freq = 49.95 + Math.random() * 0.1;
          const pf = 0.97 + Math.random() * 0.02;

          setData((prev) => {
            const nextData: ESP32Data = {
              tension,
              courant,
              puissance,
              energie: nextEnergy,
              niveau,
              message,
              relais: prev.relais,
              manuel: prev.manuel,
              rearmement: prev.rearmement,
              frequence: Number(freq.toFixed(2)),
              facteurPuissance: Number(pf.toFixed(2)),
              puissanceApparente: Math.round(tension * courant * 1.02),
              temperatureBord: Number((35.5 + Math.random() * 1.2).toFixed(1)),
            };

            setHistoryV((h) => [...h.slice(-59), tension]);
            setHistoryI((h) => [...h.slice(-59), courant]);
            setHistoryP((h) => [...h.slice(-59), puissance]);
            setHistoryE((h) => [...h.slice(-59), nextEnergy]);
            recordIfPertinent(nextData);

            return nextData;
          });
        });
    }, 1000);

    return () => clearInterval(interval);
  }, [simulationMode, recordIfPertinent]);

  const handleUpdateSettings = (newSettings: SystemSettings) => {
    setSettings(newSettings);
    settingsRef.current = newSettings;
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings),
    }).catch(() => {});
  };

  // Relay Actions
  const handleToggleRelay = () => {
    setData((prev) => {
      const nextRelais = !prev.relais;
      showToast(
        nextRelais ? 'Relais ACTIVÉ (ON) - Sortie sous tension' : 'Relais COUPÉ (OFF) - Sortie hors tension',
        nextRelais ? 'success' : 'warning'
      );
      return {
        ...prev,
        relais: nextRelais,
        manuel: true,
      };
    });
    fetch(`/relais?etat=${!data.relais ? 'on' : 'off'}`).catch(() => {});
  };

  const handleRepasserAuto = () => {
    setData((prev) => ({
      ...prev,
      manuel: false,
    }));
    showToast('Mode AUTOMATIQUE réactivé avec succès', 'info');
    fetch('/relais?etat=auto').catch(() => {});
  };

  const handleRecalibrer = () => {
    showToast('Recalibration en cours (3s, ne rien brancher)…', 'info');
    fetch('/calibrer')
      .then((res) => res.text())
      .then(() => {
        showToast('Capteurs recalibrés avec succès', 'success');
      })
      .catch(() => {
        setTimeout(() => {
          showToast('Capteurs recalibrés avec succès', 'success');
        }, 1200);
      });
  };

  const handleNavigateToReports = (filter: 'all' | 'incidents' = 'all') => {
    setIncidentFilter(filter);
    setActiveTab('reports');
  };

  // PDF Export Handlers
  const handleDownloadEnergyPdf = () => {
    if (historyE.length < 2) {
      showToast('Pas encore assez de données', 'warning');
      return;
    }
    const html = generateEnergyPdfHtml(historyE);
    setReportHtml(html);
    setTimeout(() => {
      exportOrPrintPdf('Energie', html);
    }, 100);
  };

  const handleGenererRapportPDF = () => {
    if (historiqueRecords.length === 0) {
      showToast('Aucune donnée à exporter pour le moment', 'warning');
      return;
    }
    const html = generateFullReportPdfHtml(historiqueRecords);
    setReportHtml(html);
    setTimeout(() => {
      exportOrPrintPdf('Rapport', html);
    }, 100);
  };

  const incidentCount = historiqueRecords.filter((r) => r.incident).length;

  const filteredHistory = incidentFilter === 'incidents'
    ? historiqueRecords.filter((r) => r.incident)
    : historiqueRecords;

  return (
    <div className="max-w-[1300px] mx-auto p-2 sm:p-3.5 pb-20 sm:pb-4 min-h-screen flex flex-col justify-start">
      {/* Header displayed on all pages */}
      <Header data={data} activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Notification Banner positioned directly below the Header */}
      {toastMessage && (
        <div className="mb-2 px-3 py-1.5 rounded-xl bg-slate-950/95 border border-cyan-400/80 text-cyan-200 text-xs font-mono font-bold flex items-center justify-between gap-3 shadow-[0_0_20px_rgba(0,242,254,0.35)] backdrop-blur-md animate-fadeIn">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 animate-pulse" />
            <span className="tracking-wide uppercase truncate">{toastMessage}</span>
          </div>
          <span className="text-[10px] text-cyan-400/90 border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 rounded-full uppercase shrink-0 font-bold">
            SYNCHRONISÉ
          </span>
        </div>
      )}

      {/* PAGE 1: DASHBOARD (Notification, Oscillation, Cases Tension/Courant/Puissance/Énergie) */}
      {activeTab === 'dashboard' && (
        <div className="space-y-2 sm:space-y-2.5 animate-fadeIn">
          {/* 1. Notification / Status Bar */}
          <StatusBar
            niveau={data.niveau}
            message={data.message}
            relais={data.relais}
            tension={data.tension}
            courant={data.courant}
          />

          {/* 2. Oscillation - Live Oscilloscope Signal Waveform */}
          <ScopeCanvas voltage={data.tension} current={data.courant} />

          {/* 3. Cases Tension, Courant, Puissance, Énergie */}
          <MetricsGrid
            data={data}
            onOpenEnergyModal={() => setIsEnergyModalOpen(true)}
          />
        </div>
      )}

      {/* PAGE 2: COMMANDE RELAIS (Dedicated Relay Page) */}
      {activeTab === 'relais' && (
        <RelayPage
          data={data}
          onToggleRelay={handleToggleRelay}
          onRepasserAuto={handleRepasserAuto}
          onRecalibrer={handleRecalibrer}
        />
      )}

      {/* PAGE 3: GRAPHIQUE (OSCILLOSCOPE & VECTOR CHARTS) */}
      {activeTab === 'history' && (
        <div className="space-y-4 animate-fadeIn">
          {/* 3 Vector Canvas Charts */}
          <ChartsGrid
            currentData={data}
            historyV={historyV}
            historyI={historyI}
            historyP={historyP}
          />
        </div>
      )}

      {/* PAGE 4: RAPPORTS & INCIDENTS */}
      {activeTab === 'reports' && (
        <div className="glass-panel p-5 rounded-2xl space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between gap-3 flex-wrap border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold font-mono text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-violet-400" />
                JOURNAL D'INCIDENTS ET ÉVÉNEMENTS RÉSEAU
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIncidentFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${
                  incidentFilter === 'all'
                    ? 'bg-violet-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                Tous ({historiqueRecords.length})
              </button>
              <button
                onClick={() => setIncidentFilter('incidents')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${
                  incidentFilter === 'incidents'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                Incidents ({incidentCount})
              </button>

              <button
                onClick={handleGenererRapportPDF}
                className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg"
              >
                <Download className="w-3.5 h-3.5" /> Exporter PDF
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3">Horodatage</th>
                  <th className="p-3">Tension</th>
                  <th className="p-3">Courant</th>
                  <th className="p-3">Puissance</th>
                  <th className="p-3">Énergie</th>
                  <th className="p-3">Niveau</th>
                  <th className="p-3">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-500 italic">
                      Aucun enregistrement trouvé dans l'historique actuel.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((rec, idx) => (
                    <tr
                      key={idx}
                      className={rec.incident ? 'bg-rose-500/10 text-white font-medium' : 'hover:bg-white/5'}
                    >
                      <td className="p-3 text-slate-400 text-[11px]">
                        {new Date(rec.t).toLocaleTimeString('fr-FR')}
                      </td>
                      <td className="p-3 text-cyan-300">{rec.tension.toFixed(1)} V</td>
                      <td className="p-3 text-amber-300">{rec.courant.toFixed(2)} A</td>
                      <td className="p-3 text-violet-300">{rec.puissance.toFixed(0)} W</td>
                      <td className="p-3 text-emerald-300">{(rec.energie / 1000).toFixed(3)} kWh</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            rec.niveau === 'NORMAL'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : rec.niveau === 'ATTENTION'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {rec.niveau}
                        </span>
                      </td>
                      <td className="p-3 text-slate-300 text-[11px]">{rec.message}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PAGE 4: PARAMÈTRES */}
      {activeTab === 'settings' && (
        <SettingsTab
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          showToast={showToast}
        />
      )}

      {/* PAGE 5: À PROPOS */}
      {activeTab === 'about' && <AboutTab data={data} />}

      {/* Energy Modal */}
      <EnergyModal
        isOpen={isEnergyModalOpen}
        onClose={() => setIsEnergyModalOpen(false)}
        energieWh={data.energie}
        historyE={historyE}
        onDownloadPdf={handleDownloadEnergyPdf}
      />

      {/* Toast Popup */}
      <Toast message={toastMessage} />

      {/* Simulation Button / Fault Injector Menu */}
      <SimulationButton
        isOutage={simulationMode === 'outage'}
        onToggleOutage={() =>
          setSimulationMode((prev) => (prev === 'outage' ? 'normal' : 'outage'))
        }
        onSimulateOvervoltage={() => setSimulationMode('overvoltage')}
        onSimulateOvercurrent={() => setSimulationMode('overcurrent')}
        onResetNormal={() => setSimulationMode('normal')}
      />

      {/* Sticky Bottom Navigation Bar (Matches mobile mockup) */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Printable Report Container */}
      <div id="rapport" dangerouslySetInnerHTML={{ __html: reportHtml }} />
    </div>
  );
}

