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
import { BottomNav } from './components/BottomNav';
import { EnergyModal } from './components/EnergyModal';
import { ActiveTab, ESP32Data, HistoryRecord } from './types';
import {
  generateEnergyPdfHtml,
  generateFullReportPdfHtml,
  exportOrPrintPdf,
} from './utils/pdfUtils';
import { CheckCircle2, AlertTriangle, AlertOctagon, Info, X } from 'lucide-react';
import { motion } from 'motion/react';
import { nativeService } from './services/nativeService';
import { esp32Dispatcher } from './services/esp32Dispatcher';
import { AppBootSplash } from './components/AppBootSplash';
import { PageTransitionLoader } from './components/PageTransitionLoader';

const INTERVALLE_RELEVE_MS = 60000; // 1 minute snapshot for PDF history

export default function App() {
  const [isBooting, setIsBooting] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Current Live State with localStorage energy persistence
  const [data, setData] = useState<ESP32Data>(() => {
    let savedEnergie = 0.0;
    try {
      const saved = localStorage.getItem('smart_energy_telemetry');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.energie === 'number') {
          savedEnergie = parsed.energie;
        }
      }
    } catch {}
    return {
      tension: 0.0,
      courant: 0.0,
      puissance: 0,
      energie: savedEnergie,
      niveau: 'ATTENTION',
      message: 'En attente de connexion du module ESP32 (Wi-Fi déconnecté)...',
      relais: true,
      manuel: false,
      rearmement: -1,
      frequence: 0.0,
      facteurPuissance: 0.0,
      puissanceApparente: 0,
      temperatureBord: 28.0,
      wifiConnected: false,
      esp32Connected: false,
    };
  });

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
  const wasConnectedRef = useRef<boolean | null>(null);

  // Configurable System Settings & Thresholds with persistent localStorage backing
  const [settings, setSettings] = useState<SystemSettings>(() => {
    try {
      const saved = localStorage.getItem('smart_energy_settings');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return {
      minVoltage: 185,
      maxVoltage: 253,
      minCurrent: 0,
      maxCurrent: 10,
      soundAlerts: true,
      connectionMode: 'ap',
      esp32Ip: '192.168.4.1',
    };
  });

  const settingsRef = useRef<SystemSettings>(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Initial sync with backend server
  useEffect(() => {
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settingsRef.current),
    }).catch(() => {});
  }, []);

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
    // 1. Android & Native Features Initialization (Permissions & Channel)
    nativeService.initNativeFeatures().then((status) => {
      if (status.isNative) {
        console.log('[Native] Initialized, notifications granted:', status.notificationsGranted);
      }
    });

    // 2. Wi-Fi & Network change listener for rapid zero-reset
    const cleanupNet = nativeService.onNetworkChange((netStatus) => {
      if (!netStatus.connected) {
        setData((prev) => ({
          ...prev,
          tension: 0.0,
          courant: 0.0,
          puissance: 0,
          puissanceApparente: 0,
          frequence: 0.0,
          facteurPuissance: 0.0,
          wifiConnected: false,
          esp32Connected: false,
          niveau: 'ATTENTION',
          message: 'Réseau Wi-Fi déconnecté — En attente du module ESP32',
        }));
        if (wasConnectedRef.current === true) {
          wasConnectedRef.current = false;
          nativeService.sendAlertNotification({
            level: 'WARNING',
            typeKey: 'deconnexion',
            title: 'LIAISON WI-FI INTERROMPUE',
            message: 'La connexion au réseau Wi-Fi a été perdue.',
            detail: 'Remise à zéro de la télémétrie active',
          });
        }
      }
    });

    // 3. Hardware Back button listener on Android
    const cleanupNativeBack = nativeService.onBackButton(() => {
      if (isEnergyModalOpen) {
        setIsEnergyModalOpen(false);
        return;
      }
      if (activeTab !== 'dashboard') {
        setActiveTab('dashboard');
        return;
      }
      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        window.history.back();
      } else {
        lastBackPressRef.current = now;
        showToast("Appuyez à nouveau pour quitter l'application", "info");
      }
    });

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
      cleanupNet();
      cleanupNativeBack();
    };
  }, [activeTab, isEnergyModalOpen, showToast]);

  const isFirstDataCycleRef = useRef<boolean>(true);

  // Record history ONLY for notable incidents, alerts, or state transitions
  const recordIfPertinent = useCallback((newData: ESP32Data) => {
    // Skip alerts and audio beeps on app launch initialization
    if (isFirstDataCycleRef.current) {
      isFirstDataCycleRef.current = false;
      dernierNiveauRef.current = newData.niveau;
      dernierRelaisRef.current = newData.relais;
      return;
    }

    const curSettings = settingsRef.current;
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
        nativeService.sendAlertNotification({
          level: 'CRITICAL',
          typeKey: 'coupure',
          title: 'COUPURE SECTEUR (0V)',
          message: 'Absence totale de tension secteur détectée sur le réseau électrique.',
          detail: 'Sortie relais isolée par mesure de protection',
          metrics: { voltage: 0, current: 0, power: 0, frequency: 0 },
        });
      } else if (newData.tension > curSettings.maxVoltage) {
        showToast(newData.message || 'SURTENSION CRITIQUE', 'danger');
        nativeService.sendAlertNotification({
          level: 'CRITICAL',
          typeKey: 'surtension',
          title: `SURTENSION SECTEUR (${newData.tension.toFixed(1)} V)`,
          message: `Tension mesurée ${newData.tension.toFixed(1)} V dépassant le seuil maximal de sécurité (${curSettings.maxVoltage} V).`,
          detail: 'Relais automatique ouvert pour protéger vos appareils connectés',
          metrics: { voltage: newData.tension, current: newData.courant, power: newData.puissance, frequency: newData.frequence, threshold: `${curSettings.maxVoltage} V` },
        });
      } else if (newData.tension < curSettings.minVoltage) {
        showToast(newData.message || 'SOUS-TENSION DÉTECTÉE', 'warning');
        nativeService.sendAlertNotification({
          level: 'WARNING',
          typeKey: 'soustension',
          title: `SOUS-TENSION SECTEUR (${newData.tension.toFixed(1)} V)`,
          message: `Tension mesurée ${newData.tension.toFixed(1)} V inférieure au seuil nominal minimal (${curSettings.minVoltage} V).`,
          detail: 'Relais déclenché pour prévenir la détérioration des moteurs/compresseurs',
          metrics: { voltage: newData.tension, current: newData.courant, power: newData.puissance, frequency: newData.frequence, threshold: `${curSettings.minVoltage} V` },
        });
      } else if (newData.courant > curSettings.maxCurrent) {
        showToast(newData.message || 'SURINTENSITÉ DÉTECTÉE', 'warning');
        nativeService.sendAlertNotification({
          level: 'WARNING',
          typeKey: 'surintensite',
          title: `SURINTENSITÉ DÉTECTÉE (${newData.courant.toFixed(2)} A)`,
          message: `Courant mesuré ${newData.courant.toFixed(2)} A supérieur au calibre assigné (${curSettings.maxCurrent} A).`,
          detail: 'Disjonction active pour éliminer tout risque d\'échauffement',
          metrics: { voltage: newData.tension, current: newData.courant, power: newData.puissance, frequency: newData.frequence, threshold: `${curSettings.maxCurrent} A` },
        });
      } else if (newData.puissance > ((curSettings.maxVoltage * curSettings.maxCurrent) || 3500)) {
        showToast('PUISSANCE EXCESSIVE', 'warning');
        nativeService.sendAlertNotification({
          level: 'WARNING',
          typeKey: 'surpuissance',
          title: `SURCHARGE DE PUISSANCE (${newData.puissance} W)`,
          message: `Puissance active consommée excessive (${newData.puissance} W).`,
          detail: 'Surveillance thermique active',
          metrics: { voltage: newData.tension, current: newData.courant, power: newData.puissance, frequency: newData.frequence },
        });
      } else if (!newData.relais && dernierRelaisRef.current === true) {
        showToast('RELAIS DÉCONNECTÉ (OFF)', 'warning');
        nativeService.sendAlertNotification({
          level: 'WARNING',
          typeKey: 'relais_off',
          title: 'RELAIS DE SÉCURITÉ OUVERT (OFF)',
          message: 'La charge électrique a été coupée par le système de sécurité.',
          detail: 'Protection des charges actives',
          metrics: { voltage: newData.tension, current: newData.courant, power: newData.puissance, frequency: newData.frequence },
        });
      } else if (dernierNiveauRef.current && dernierNiveauRef.current !== 'NORMAL' && newData.niveau === 'NORMAL') {
        showToast('RETOUR À L\'ÉTAT NORMAL', 'success');
        nativeService.sendAlertNotification({
          level: 'NORMAL',
          typeKey: 'normal',
          title: 'RÉSEAU ÉLECTRIQUE NORMALISÉ',
          message: `Paramètres électriques stabilisés à ${newData.tension.toFixed(1)} V et ${newData.courant.toFixed(2)} A.`,
          detail: 'Toutes les métriques sont conformes aux plages autorisées',
          metrics: { voltage: newData.tension, current: newData.courant, power: newData.puissance, frequency: newData.frequence },
        });
      }

      if (curSettings.soundAlerts && estIncident) {
        playAlertSound(1046, 0.3);
      }
    }

    dernierNiveauRef.current = newData.niveau;
    dernierRelaisRef.current = newData.relais;
  }, [playAlertSound, showToast]);

  // Screen WakeLock to maintain Wi-Fi active telemetry without Android sleeping
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch {}
    };

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock && typeof wakeLock.release === 'function') {
        wakeLock.release().catch(() => {});
      }
    };
  }, []);

  const consecutiveFailsRef = useRef<number>(0);
  const activeEndpointRef = useRef<string | null>(null);

  // Data Fetching Loop supporting Direct ESP32 AP Mode, Multi-Target Fallback & Zero-Reset Fault Tolerance
  useEffect(() => {
    let isMounted = true;

    const performFetch = async () => {
      const curSettings = settingsRef.current;
      const targetIp = curSettings.connectionMode === 'custom' && curSettings.esp32Ip
        ? curSettings.esp32Ip.replace(/^http:\/\//, '')
        : '192.168.4.1';

      let fetched: ESP32Data | null = null;
      let workingEndpoint: string | null = null;

      // 1. Try unified multi-channel telemetry fetch (Direct Fetch -> JSONP -> Local Proxy)
      try {
        const result = await esp32Dispatcher.fetchTelemetry(targetIp);
        if (result && (typeof result.tension === 'number' || typeof result.v === 'number')) {
          fetched = result;
          workingEndpoint = `http://${targetIp}/data`;
        }
      } catch {}

      // 2. Candidate list of endpoints fallback
      if (!fetched) {
        const candidates: string[] = [];
        if (activeEndpointRef.current) {
          candidates.push(activeEndpointRef.current);
        }
        if (curSettings.connectionMode !== 'server') {
          const directIpUrl = `http://${targetIp}/data`;
          if (!candidates.includes(directIpUrl)) candidates.push(directIpUrl);
          const apUrl = 'http://192.168.4.1/data';
          if (!candidates.includes(apUrl)) candidates.push(apUrl);
        }
        if (!candidates.includes('/api/data')) candidates.push('/api/data');
        if (!candidates.includes('/data')) candidates.push('/data');

        for (const endpoint of candidates) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 950);
            const res = await fetch(endpoint, {
              signal: controller.signal,
              mode: 'cors',
            });
            clearTimeout(timeoutId);
            if (res.ok) {
              const json = await res.json();
              if (json && (typeof json.tension === 'number' || typeof json.v === 'number')) {
                fetched = json;
                workingEndpoint = endpoint;
                break;
              }
            }
          } catch {
            // Candidate unavailable, continue to next
          }
        }
      }

      if (!isMounted) return;

      if (fetched) {
        consecutiveFailsRef.current = 0;
        activeEndpointRef.current = workingEndpoint;

        let updatedData: ESP32Data = { ...fetched };

        // Ensure wifiConnected flag is set correctly
        if (updatedData.wifiConnected === undefined) {
          updatedData.wifiConnected = true;
        }
        updatedData.wifiConnected = true;
        updatedData.esp32Connected = true;

        // If tension is zero (sans secteur / mains outage), all derived AC metrics must be strictly zero
        if (updatedData.tension === 0) {
          updatedData.courant = 0;
          updatedData.puissance = 0;
          updatedData.puissanceApparente = 0;
          updatedData.frequence = 0;
          updatedData.facteurPuissance = 0;
        }

        // Automatic threshold protection evaluation on client using the user's fixed settings
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

        // Cache last valid energy to localStorage
        try {
          localStorage.setItem('smart_energy_telemetry', JSON.stringify(updatedData));
        } catch {}

        setData(updatedData);

        // Connection restored notification
        if (wasConnectedRef.current === false) {
          wasConnectedRef.current = true;
          nativeService.sendAlertNotification({
            level: 'INFO',
            typeKey: 'connexion',
            title: 'ESP32 CONNECTÉ AU RÉSEAU',
            message: `Liaison télémétrique active établie avec le module (${targetIp}).`,
            detail: 'Acquisition des grandeurs électriques en temps réel',
            metrics: { voltage: updatedData.tension, current: updatedData.courant, power: updatedData.puissance },
          });
        } else if (wasConnectedRef.current === null) {
          wasConnectedRef.current = true;
        }

        setHistoryV((prev) => [...prev.slice(-59), updatedData.tension]);
        setHistoryI((prev) => [...prev.slice(-59), updatedData.courant]);
        setHistoryP((prev) => [...prev.slice(-59), updatedData.puissance]);
        setHistoryE((prev) => [...prev.slice(-59), updatedData.energie]);
        recordIfPertinent(updatedData);
      } else {
        // Increment consecutive failure counter
        consecutiveFailsRef.current += 1;

        // Disconnected state: strictly 0V, 0A, 0W when ESP32 is unplugged or Wi-Fi lost
        if (consecutiveFailsRef.current >= 2) {
          if (wasConnectedRef.current === true) {
            wasConnectedRef.current = false;
            nativeService.sendAlertNotification({
              level: 'WARNING',
              typeKey: 'deconnexion',
              title: 'LIAISON ESP32 DÉCONNECTÉE',
              message: `Le module ESP32 (${targetIp}) est débranché ou hors de portée.`,
              detail: 'Tension, courant et puissance remis à 0.0',
              metrics: { voltage: 0, current: 0, power: 0 },
            });
          }
          activeEndpointRef.current = null;
          setData((prev) => ({
            ...prev,
            tension: 0.0,
            courant: 0.0,
            puissance: 0,
            puissanceApparente: 0,
            frequence: 0.0,
            facteurPuissance: 0.0,
            wifiConnected: false,
            esp32Connected: false,
            // Keep cumulative Wh energy intact
            niveau: 'ATTENTION',
            message: `Module ESP32 déconnecté (${targetIp}) — Wi-Fi hors ligne`,
          }));
        }
      }
    };

    // Run first fetch immediately on app mount
    performFetch();
    const interval = setInterval(performFetch, 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [recordIfPertinent]);

  const handleUpdateSettings = (newSettings: SystemSettings) => {
    setSettings(newSettings);
    settingsRef.current = newSettings;
    try {
      localStorage.setItem('smart_energy_settings', JSON.stringify(newSettings));
    } catch {}

    // Request system notification permission on user action if enabled
    if (newSettings.soundAlerts && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      try {
        Notification.requestPermission().catch(() => {});
      } catch {}
    }

    // Immediately evaluate protection with new threshold limits
    setData((prev) => {
      let nextData = { ...prev };
      if (!nextData.manuel) {
        if (nextData.tension === 0) {
          nextData.niveau = 'DANGER';
          nextData.message = 'Coupure secteur (0V) détectée';
          nextData.relais = false;
        } else if (nextData.tension > newSettings.maxVoltage) {
          nextData.niveau = 'DANGER';
          nextData.message = `Surtension secteur (${nextData.tension.toFixed(1)}V > ${newSettings.maxVoltage}V) — Relais déclenché`;
          nextData.relais = false;
        } else if (nextData.tension < newSettings.minVoltage) {
          nextData.niveau = 'ATTENTION';
          nextData.message = `Sous-tension secteur (${nextData.tension.toFixed(1)}V < ${newSettings.minVoltage}V) — Relais déclenché`;
          nextData.relais = false;
        } else if (nextData.courant > newSettings.maxCurrent) {
          nextData.niveau = 'ATTENTION';
          nextData.message = `Surcharge courant (${nextData.courant.toFixed(2)}A > ${newSettings.maxCurrent}A) — Relais déclenché`;
          nextData.relais = false;
        } else {
          nextData.niveau = 'NORMAL';
          nextData.relais = true;
          nextData.message = 'Système nominal (Protection active)';
        }

        if (!nextData.relais) {
          nextData.courant = 0;
          nextData.puissance = 0;
          nextData.puissanceApparente = 0;
        }
      }
      return nextData;
    });

    // Dispatch settings to local server and directly to ESP32 WebServer
    const targetIp = newSettings.esp32Ip || '192.168.4.1';
    esp32Dispatcher.dispatchAction('/settings', {
      minVoltage: newSettings.minVoltage,
      maxVoltage: newSettings.maxVoltage,
      maxCurrent: newSettings.maxCurrent,
      soundAlerts: newSettings.soundAlerts,
    }, targetIp);
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

    // Multi-protocol dispatch: Image Beacon + No-CORS Fetch + Standard Fetch + Local Proxy
    esp32Dispatcher.dispatchAction('/relais', { etat: nextRelais ? 'on' : 'off' }, targetIp);
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
    esp32Dispatcher.dispatchAction('/relais', { etat: 'auto' }, targetIp);
  };

  const handleRecalibrer = () => {
    const targetIp = settingsRef.current.esp32Ip || '192.168.4.1';
    showToast('Recalibration des capteurs en cours…', 'info');
    esp32Dispatcher.dispatchAction('/calibrer', {}, targetIp);
    setTimeout(() => {
      showToast('Capteurs et compteur recalibrés avec succès', 'success');
    }, 400);
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
      const targetIp = settingsRef.current.esp32Ip || '192.168.4.1';
      fetch(`http://${targetIp}/calibrer`, { mode: 'cors' }).catch(() => {});
      fetch('/calibrer').catch(() => {});
    }
  };

  return (
    <div className="max-w-[1300px] mx-auto p-2 sm:p-3.5 pb-[calc(5.2rem+env(safe-area-inset-bottom,0px))] sm:pb-6 min-h-screen flex flex-col justify-start">
      {/* High-Tech App Launch Splash & Boot Loader */}
      {isBooting && (
        <AppBootSplash
          onBootComplete={() => setIsBooting(false)}
          esp32Connected={data.esp32Connected}
        />
      )}

      {/* Laser Top Progress Glow Indicator on Tab / Route Change */}
      <PageTransitionLoader activeTab={activeTab} />

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

      {/* Main Tab Content View Container */}
      <main className="flex-1 w-full">
        {/* PAGE 1: DASHBOARD (Notification, Oscillation, Cases Métriques) */}
        {activeTab === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="space-y-2.5 sm:space-y-3.5"
          >
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
          </motion.div>
        )}

        {/* PAGE 2: COMMANDE RELAIS (Dedicated Relay Page) */}
        {activeTab === 'relais' && (
          <motion.div
            key="relais"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <RelayPage
              data={data}
              settings={settings}
              onToggleRelay={handleToggleRelay}
              onRepasserAuto={handleRepasserAuto}
              onRecalibrer={handleRecalibrer}
            />
          </motion.div>
        )}

        {/* PAGE 3: GRAPHIQUE (OSCILLOSCOPE & VECTOR CHARTS) */}
        {activeTab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="space-y-4"
          >
            {/* 3 Vector Canvas Charts */}
            <ChartsGrid
              currentData={data}
              historyV={historyV}
              historyI={historyI}
              historyP={historyP}
            />
          </motion.div>
        )}

        {/* PAGE 4: RAPPORTS & INCIDENTS */}
        {activeTab === 'reports' && (
          <motion.div
            key="reports"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <ReportsTab
              records={historiqueRecords}
              onClearReports={handleClearReports}
              onExportPdf={handleGenererRapportPDF}
              showToast={showToast}
            />
          </motion.div>
        )}

        {/* PAGE 5: PARAMÈTRES */}
        {activeTab === 'settings' && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <SettingsTab
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              showToast={showToast}
            />
          </motion.div>
        )}
      </main>

      {/* Energy Modal */}
      <EnergyModal
        isOpen={isEnergyModalOpen}
        onClose={handleCloseEnergyModal}
        energieWh={data.energie}
        historyE={historyE}
        onDownloadPdf={handleDownloadEnergyPdf}
      />

      {/* Sticky Bottom Navigation Bar (Matches mobile mockup) */}
      <BottomNav activeTab={activeTab} setActiveTab={handleSelectTab} />

      {/* Printable Report Container */}
      <div id="rapport" dangerouslySetInnerHTML={{ __html: reportHtml }} />
    </div>
  );
}

