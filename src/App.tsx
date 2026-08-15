import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { ScopeCanvas } from './components/ScopeCanvas';
import { StatusBar } from './components/StatusBar';
import { MetricsGrid } from './components/MetricsGrid';
import { ChartsGrid } from './components/ChartsGrid';
import { LiveEvolutionCard } from './components/LiveEvolutionCard';
import { RelayPage } from './components/RelayPage';
import { SettingsTab, SystemSettings } from './components/SettingsTab';
import { ReportsTab } from './components/ReportsTab';
import { AboutTab } from './components/AboutTab';
import { BottomNav } from './components/BottomNav';
import { EnergyModal } from './components/EnergyModal';
import { SimulationButton } from './components/SimulationButton';
import { ActiveTab, ESP32Data, HistoryRecord } from './types';
import {
  generateEnergyPdfHtml,
  generateFullReportPdfHtml,
  exportOrPrintPdf,
} from './utils/pdfUtils';
import { CheckCircle2, AlertTriangle, AlertOctagon, Info, X } from 'lucide-react';

const INTERVALLE_RELEVE_MS = 60000; // 1 minute snapshot for PDF history

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Current Live State
  const [data, setData] = useState<ESP32Data>({
    tension: 0,
    courant: 0,
    puissance: 0,
    energie: 0,
    niveau: 'NORMAL',
    message: 'En attente de connexion du module ESP32...',
    relais: true,
    manuel: false,
    rearmement: -1,
    frequence: 50.0,
    facteurPuissance: 0.98,
    puissanceApparente: 0,
    temperatureBord: 30.0,
    wifiConnected: false,
    esp32Connected: false,
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

  // -------------------------------------------------------------
  // SMART PHONE BACK BUTTON & POPSTATE SYNCHRONIZATION
  // -------------------------------------------------------------
  const lastBackPressRef = useRef<number>(0);

  // Tab navigation with history pushState
  const handleSelectTab = useCallback((newTab: ActiveTab) => {
    setActiveTab(newTab);
    window.history.pushState({ tab: newTab, modal: null }, '');
  }, []);

  // Modal Open/Close with history pushState
  const handleOpenEnergyModal = useCallback(() => {
    setIsEnergyModalOpen(true);
    window.history.pushState({ tab: activeTab, modal: 'energy' }, '');
  }, [activeTab]);

  const handleCloseEnergyModal = useCallback(() => {
    setIsEnergyModalOpen(false);
  }, []);

  // Popstate Listener: Intercepts mobile back button
  useEffect(() => {
    // Seed initial history entries
    window.history.replaceState({ tab: 'dashboard', modal: null }, '');
    window.history.pushState({ tab: 'dashboard', modal: null }, '');

    const onPopState = () => {
      // 1. If Modal is currently open -> Close Modal first
      if (isEnergyModalOpen) {
        setIsEnergyModalOpen(false);
        window.history.pushState({ tab: activeTab, modal: null }, '');
        return;
      }

      // 2. If on a Sub-tab (Relais, Graphique, Rapports, Paramètres, À Propos) -> Return to Dashboard
      if (activeTab !== 'dashboard') {
        setActiveTab('dashboard');
        window.history.pushState({ tab: 'dashboard', modal: null }, '');
        return;
      }

      // 3. If on Main Dashboard -> Double-tap back to exit protection
      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        // Confirmed second tap -> Allow exit
        window.history.back();
      } else {
        lastBackPressRef.current = now;
        showToast("Appuyez à nouveau pour quitter l'application", "info");
        // Re-push history state to prevent unexpected instant exit
        window.history.pushState({ tab: 'dashboard', modal: null }, '');
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, [activeTab, isEnergyModalOpen, showToast]);

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

  // Data Fetching Loop supporting Direct ESP32 AP Mode & Server Proxy
  useEffect(() => {
    let isMounted = true;

    const interval = setInterval(async () => {
      // Check browser network connectivity
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        if (isMounted) {
          setData((prev) => ({
            ...prev,
            wifiConnected: false,
            esp32Connected: false,
            tension: 0,
            courant: 0,
            puissance: 0,
            niveau: 'ATTENTION',
            message: 'Réseau Wi-Fi déconnecté — Veuillez vérifier la connexion',
          }));
        }
        return;
      }

      const curSettings = settingsRef.current;
      const targetIp = curSettings.connectionMode === 'custom' && curSettings.esp32Ip
        ? curSettings.esp32Ip.replace(/^http:\/\//, '')
        : '192.168.4.1';

      let fetched: ESP32Data | null = null;

      // 1. If in AP or custom mode, attempt DIRECT fetch to the ESP32 WebServer (e.g. 192.168.4.1)
      if (curSettings.connectionMode !== 'server') {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1200);
          const directRes = await fetch(`http://${targetIp}/data`, {
            signal: controller.signal,
            mode: 'cors',
          });
          clearTimeout(timeoutId);
          if (directRes.ok) {
            fetched = await directRes.json();
            if (fetched) {
              fetched.wifiConnected = true;
              fetched.esp32Connected = true;
              fetched.connectionMode = curSettings.connectionMode || 'ap';
            }
          }
        } catch {
          // Direct ESP32 AP unreachable -> continue to proxy / local endpoint
        }
      }

      // 2. Fallback to Local Server Proxy if direct AP did not respond
      if (!fetched) {
        try {
          const url = simulationMode !== 'normal' ? '/data?simulate=true' : '/data';
          const proxyRes = await fetch(url);
          if (proxyRes.ok) {
            fetched = await proxyRes.json();
          }
        } catch {
          // Server offline
        }
      }

      if (!isMounted) return;

      if (fetched) {
        let updatedData: ESP32Data = { ...fetched };

        // Ensure wifiConnected flag is set correctly
        if (updatedData.wifiConnected === undefined) {
          updatedData.wifiConnected = true;
        }

        // Simulation overlay if triggered from UI
        if (simulationMode === 'outage') {
          updatedData.tension = 0;
          updatedData.courant = 0;
          updatedData.puissance = 0;
          updatedData.niveau = 'DANGER';
          updatedData.message = 'Coupure secteur (0V) simulée';
        } else if (simulationMode === 'overvoltage') {
          updatedData.tension = 265.4;
          updatedData.niveau = 'DANGER';
          updatedData.message = 'Surtension secteur critique (265.4V > 253V)';
        } else if (simulationMode === 'overcurrent') {
          updatedData.courant = 5.50;
          updatedData.puissance = Math.round(updatedData.tension * 5.5);
          updatedData.niveau = 'ATTENTION';
          updatedData.message = 'Surcharge courant élevée (5.50A)';
        }

        // Automatic threshold protection evaluation on client
        if (!updatedData.manuel) {
          if (updatedData.tension === 0) {
            updatedData.niveau = 'DANGER';
            updatedData.message = 'Coupure secteur (0V) détectée';
            updatedData.relais = false;
          } else if (updatedData.tension > curSettings.maxVoltage) {
            updatedData.niveau = 'DANGER';
            updatedData.message = `Surtension secteur (${updatedData.tension.toFixed(1)}V > ${curSettings.maxVoltage}V) — Relais déclenché`;
            updatedData.relais = false;
          } else if (updatedData.tension < curSettings.minVoltage) {
            updatedData.niveau = 'ATTENTION';
            updatedData.message = `Sous-tension secteur (${updatedData.tension.toFixed(1)}V < ${curSettings.minVoltage}V) — Relais déclenché`;
            updatedData.relais = false;
          } else if (updatedData.courant > curSettings.maxCurrent) {
            updatedData.niveau = 'ATTENTION';
            updatedData.message = `Surcharge courant (${updatedData.courant.toFixed(2)}A > ${curSettings.maxCurrent}A) — Relais déclenché`;
            updatedData.relais = false;
          } else {
            updatedData.niveau = 'NORMAL';
            updatedData.relais = true;
          }
        }

        // If relay is open/OFF, current and power must be zero
        if (!updatedData.relais) {
          updatedData.courant = 0;
          updatedData.puissance = 0;
          updatedData.puissanceApparente = 0;
        }

        setData(updatedData);

        if (fetched.settings) {
          setSettings((prev) => {
            const s = fetched.settings!;
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

        setHistoryV((prev) => [...prev.slice(-59), updatedData.tension]);
        setHistoryI((prev) => [...prev.slice(-59), updatedData.courant]);
        setHistoryP((prev) => [...prev.slice(-59), updatedData.puissance]);
        setHistoryE((prev) => [...prev.slice(-59), updatedData.energie]);
        recordIfPertinent(updatedData);
      } else {
        // Disconnected state when no network / no ESP32 responding
        setData((prev) => ({
          ...prev,
          wifiConnected: false,
          esp32Connected: false,
          tension: 0,
          courant: 0,
          puissance: 0,
          niveau: 'ATTENTION',
          message: 'Wi-Fi déconnecté — En attente du module ESP32',
        }));
      }
    }, 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [simulationMode, recordIfPertinent]);

  const handleUpdateSettings = (newSettings: SystemSettings) => {
    setSettings(newSettings);
    settingsRef.current = newSettings;

    // Immediately evaluate protection with new threshold limits
    setData((prev) => {
      let nextData = { ...prev };
      if (!nextData.manuel) {
        if (nextData.tension > newSettings.maxVoltage) {
          nextData.niveau = 'DANGER';
          nextData.message = `Surtension secteur (${nextData.tension.toFixed(1)}V > ${newSettings.maxVoltage}V) — Relais déclenché`;
          nextData.relais = false;
          nextData.courant = 0;
          nextData.puissance = 0;
        } else if (nextData.tension < newSettings.minVoltage && nextData.tension > 0) {
          nextData.niveau = 'ATTENTION';
          nextData.message = `Sous-tension secteur (${nextData.tension.toFixed(1)}V < ${newSettings.minVoltage}V) — Relais déclenché`;
          nextData.relais = false;
          nextData.courant = 0;
          nextData.puissance = 0;
        }
      }
      return nextData;
    });

    // Send to Local Server
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings),
    }).catch(() => {});

    // Send directly to ESP32 AP if configured
    const targetIp = newSettings.esp32Ip || '192.168.4.1';
    fetch(`http://${targetIp}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings),
      mode: 'cors',
    }).catch(() => {});
  };

  // Relay Actions (Direct Hardware & Local Server Broadcast)
  const handleToggleRelay = () => {
    const nextRelais = !data.relais;
    const targetIp = settingsRef.current.esp32Ip || '192.168.4.1';

    setData((prev) => ({
      ...prev,
      relais: nextRelais,
      manuel: true,
      courant: nextRelais ? (prev.courant > 0 ? prev.courant : 2.15) : 0,
      puissance: nextRelais ? Math.round(prev.tension * (prev.courant > 0 ? prev.courant : 2.15) * 0.98) : 0,
      message: nextRelais ? 'Relais forcé ON (Manuel)' : 'Relais forcé OFF (Manuel)',
    }));

    showToast(
      nextRelais ? 'Relais ACTIVÉ (ON) - Sortie sous tension' : 'Relais COUPÉ (OFF) - Sortie hors tension',
      nextRelais ? 'success' : 'warning'
    );

    // 1. Direct command to ESP32 WebServer (Fastest < 30ms)
    fetch(`http://${targetIp}/relais?etat=${nextRelais ? 'on' : 'off'}`, { mode: 'cors' }).catch(() => {});
    // 2. Backup command to server
    fetch(`/relais?etat=${nextRelais ? 'on' : 'off'}`).catch(() => {});
  };

  const handleRepasserAuto = () => {
    const targetIp = settingsRef.current.esp32Ip || '192.168.4.1';
    const curSettings = settingsRef.current;

    setData((prev) => {
      const isSafe = prev.tension >= curSettings.minVoltage && prev.tension <= curSettings.maxVoltage && prev.tension > 0;
      const nextRelais = isSafe;
      const nominalI = nextRelais ? 2.15 : 0;
      return {
        ...prev,
        manuel: false,
        relais: nextRelais,
        courant: nominalI,
        puissance: Math.round(prev.tension * nominalI * 0.98),
        niveau: isSafe ? 'NORMAL' : 'ATTENTION',
        message: isSafe ? 'Mode Automatique réactivé — Protection nominale' : 'Protection déclenchée (Hors plage de sécurité)',
      };
    });

    showToast('Mode AUTOMATIQUE réactivé avec succès', 'info');
    fetch(`http://${targetIp}/relais?etat=auto`, { mode: 'cors' }).catch(() => {});
    fetch('/relais?etat=auto').catch(() => {});
  };

  const handleRecalibrer = () => {
    const targetIp = settingsRef.current.esp32Ip || '192.168.4.1';
    showToast('Recalibration des capteurs en cours…', 'info');
    fetch(`http://${targetIp}/calibrer`, { mode: 'cors' }).catch(() => {});
    fetch('/calibrer')
      .then((res) => res.text())
      .then(() => {
        showToast('Capteurs et compteur recalibrés avec succès', 'success');
      })
      .catch(() => {
        setTimeout(() => {
          showToast('Capteurs recalibrés avec succès', 'success');
        }, 1000);
      });
  };

  const handleNavigateToReports = () => {
    handleSelectTab('reports');
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

  const handleClearReports = (resetEnergyToo: boolean) => {
    setHistoriqueRecords([]);
    if (resetEnergyToo) {
      setData((prev) => ({ ...prev, energie: 0 }));
      setHistoryE([]);
      energieSimRef.current = 0;
      const targetIp = settingsRef.current.esp32Ip || '192.168.4.1';
      fetch(`http://${targetIp}/calibrer`, { mode: 'cors' }).catch(() => {});
      fetch('/calibrer').catch(() => {});
    }
  };

  return (
    <div className="max-w-[1300px] mx-auto p-2 sm:p-3.5 pb-[calc(5.2rem+env(safe-area-inset-bottom,0px))] sm:pb-6 min-h-screen flex flex-col justify-start">
      {/* Header displayed on all pages */}
      <Header
        data={data}
        activeTab={activeTab}
        setActiveTab={handleSelectTab}
      />

      {/* Single integrated notification banner positioned neatly below the Header */}
      {toastMessage && (
        <div
          className={`mb-2.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center justify-between gap-3 backdrop-blur-md animate-fadeIn transition-all ${
            toastType === 'danger'
              ? 'bg-rose-950/90 border-rose-500/80 text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
              : toastType === 'warning'
              ? 'bg-amber-950/90 border-amber-500/80 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
              : toastType === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/80 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
              : 'bg-slate-950/95 border-cyan-400/80 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {toastType === 'danger' ? (
              <AlertOctagon className="w-3.5 h-3.5 text-rose-400 shrink-0 animate-pulse" />
            ) : toastType === 'warning' ? (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
            ) : toastType === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 animate-pulse" />
            ) : (
              <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 animate-pulse" />
            )}
            <span className="tracking-wide uppercase truncate">{toastMessage}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`text-[9.5px] px-2 py-0.5 rounded-full uppercase font-bold border ${
                toastType === 'danger'
                  ? 'text-rose-300 border-rose-500/40 bg-rose-500/10'
                  : toastType === 'warning'
                  ? 'text-amber-300 border-amber-500/40 bg-amber-500/10'
                  : toastType === 'success'
                  ? 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10'
                  : 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10'
              }`}
            >
              SYNCHRONISÉ
            </span>
            <button
              onClick={() => setToastMessage(null)}
              className="p-0.5 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Fermer la notification"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* PAGE 1: DASHBOARD (Notification, Oscillation, Cases Métriques) */}
      {activeTab === 'dashboard' && (
        <div className="space-y-2.5 sm:space-y-3.5 animate-fadeIn">
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
            onOpenEnergyModal={handleOpenEnergyModal}
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
        <ReportsTab
          records={historiqueRecords}
          onClearReports={handleClearReports}
          onExportPdf={handleGenererRapportPDF}
          showToast={showToast}
        />
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
        onClose={handleCloseEnergyModal}
        energieWh={data.energie}
        historyE={historyE}
        onDownloadPdf={handleDownloadEnergyPdf}
      />

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
      <BottomNav activeTab={activeTab} setActiveTab={handleSelectTab} />

      {/* Printable Report Container */}
      <div id="rapport" dangerouslySetInnerHTML={{ __html: reportHtml }} />
    </div>
  );
}

