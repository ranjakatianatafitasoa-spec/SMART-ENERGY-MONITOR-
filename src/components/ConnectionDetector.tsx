import React, { useState } from 'react';
import {
  Wifi,
  Radio,
  RefreshCw,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Server,
  Zap,
  Cpu,
  ArrowDownCircle,
  Clock,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ESP32Data } from '../types';

export interface ConnectionDetectorProps {
  data: ESP32Data;
  activeSource: 'esp32_direct' | 'esp32_lan' | 'local_server' | 'offline';
  latencyMs: number | null;
  packetCount: number;
  lastSyncTime: Date | null;
  isScanning: boolean;
  onScanReconnect: () => void;
  onSelectMode?: (mode: 'ap' | 'server' | 'custom', ip?: string) => void;
}

export const ConnectionDetector: React.FC<ConnectionDetectorProps> = ({
  data,
  activeSource,
  latencyMs,
  packetCount,
  lastSyncTime,
  isScanning,
  onScanReconnect,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const getSourceDetails = () => {
    switch (activeSource) {
      case 'esp32_direct':
        return {
          label: 'ESP32 Wi-Fi Direct (Point d\'Accès)',
          endpoint: 'http://192.168.4.1/data',
          ip: '192.168.4.1',
          ssid: 'SMART_ENERGY_MONITOR',
          badge: 'DIRECT AP',
          color: 'text-cyan-400',
          bg: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300',
          desc: 'Connexion directe sans routeur ni box internet',
          icon: <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />,
        };
      case 'esp32_lan':
        return {
          label: 'ESP32 Réseau Local (IP dédiée)',
          endpoint: `http://${data.esp32Ip || 'IP_ESP32'}/data`,
          ip: data.esp32Ip || '192.168.1.x',
          ssid: 'Réseau Local Wi-Fi',
          badge: 'LAN DIRECT',
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
          desc: 'Transmission en réseau local Wi-Fi privé',
          icon: <Wifi className="w-4 h-4 text-emerald-400 animate-pulse" />,
        };
      case 'local_server':
        return {
          label: 'Serveur Relais & API Gateway',
          endpoint: '/data',
          ip: '127.0.0.1 (Localhost / Cloud)',
          ssid: 'Passerelle API',
          badge: 'PASSERELLE',
          color: 'text-violet-400',
          bg: 'bg-violet-500/15 border-violet-500/40 text-violet-300',
          desc: 'Acquisition via serveur intermédiaire',
          icon: <Server className="w-4 h-4 text-violet-400" />,
        };
      case 'offline':
      default:
        return {
          label: 'En attente de connexion',
          endpoint: '192.168.4.1 (Non joignable)',
          ip: 'Inconnue',
          ssid: 'Déconnecté',
          badge: 'HORS LIGNE',
          color: 'text-rose-400',
          bg: 'bg-rose-500/15 border-rose-500/40 text-rose-300',
          desc: 'Connectez le smartphone au Wi-Fi "SMART_ENERGY_MONITOR"',
          icon: <AlertTriangle className="w-4 h-4 text-rose-400 animate-ping" />,
        };
    }
  };

  const src = getSourceDetails();
  const isOnline = activeSource !== 'offline' && data.wifiConnected !== false;

  return (
    <div className="glass-panel rounded-2xl border border-slate-800/90 bg-slate-950/85 p-2.5 sm:p-3 shadow-lg font-mono text-xs transition-all overflow-hidden mb-2">
      {/* Primary Detector Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        {/* Left: Source Icon & Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
            {src.icon}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">
                DÉTECTEUR DE LIAISON DONNÉES :
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold border ${src.bg}`}>
                {src.badge}
              </span>
              {latencyMs !== null && (
                <span className="text-[10px] text-cyan-300 font-bold bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                  {latencyMs} ms
                </span>
              )}
            </div>

            <div className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-2 truncate">
              <span className="truncate">{src.label}</span>
              <span className="text-[10px] text-slate-500 font-normal hidden sm:inline">
                ({src.ip})
              </span>
            </div>
          </div>
        </div>

        {/* Right: Quick Stats & Scan Action */}
        <div className="flex items-center justify-between md:justify-end gap-2 border-t md:border-t-0 pt-2 md:pt-0 border-slate-800/80">
          {/* Packet Counter */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-[10.5px]">
            <ArrowDownCircle className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-slate-400">Reçus:</span>
            <span className="font-bold text-cyan-300">{packetCount}</span>
          </div>

          {/* Sync Timestamp */}
          <div className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-[10.5px] text-slate-300">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{lastSyncTime ? lastSyncTime.toLocaleTimeString('fr-FR') : '--:--:--'}</span>
          </div>

          {/* Scan & Reconnect Button */}
          <button
            onClick={onScanReconnect}
            disabled={isScanning}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95 disabled:opacity-50 text-[11px] shrink-0"
            title="Sonder et auto-détecter les sources de données ESP32"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Détection...' : 'Re-détecter'}</span>
          </button>

          {/* Expand Details Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-all cursor-pointer shrink-0"
            title="Détails du détecteur de données"
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expandable Diagnostic Panel */}
      {isExpanded && (
        <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] animate-fadeIn">
          {/* Card 1: Canal & Point d'Accès */}
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
            <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center justify-between">
              <span>Canal Wi-Fi</span>
              <Radio className="w-3 h-3 text-cyan-400" />
            </div>
            <div className="font-bold text-slate-200">
              SSID: <span className="text-cyan-300">SMART_ENERGY_MONITOR</span>
            </div>
            <div className="text-[10px] text-slate-400">
              Mot de passe AP: <span className="text-slate-300 font-bold">12345678</span>
            </div>
          </div>

          {/* Card 2: Endpoint Actif */}
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
            <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center justify-between">
              <span>Flux REST API</span>
              <Activity className="w-3 h-3 text-emerald-400" />
            </div>
            <div className="font-bold text-emerald-300 truncate" title={src.endpoint}>
              {src.endpoint}
            </div>
            <div className="text-[10px] text-slate-400">
              Fréquence : <span className="text-slate-300 font-bold">1 échantillon / seconde</span>
            </div>
          </div>

          {/* Card 3: État Matériel ESP32 */}
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
            <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center justify-between">
              <span>État Télémétrie</span>
              <ShieldCheck className="w-3 h-3 text-cyan-400" />
            </div>
            <div className="font-bold text-slate-200 flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
              <span className={isOnline ? 'text-emerald-300' : 'text-rose-300'}>
                {isOnline ? 'Réception continue active' : 'Signal en attente'}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              Relais : <strong className={data.relais ? 'text-emerald-400' : 'text-rose-400'}>{data.relais ? 'ON (Passant)' : 'OFF (Coupé)'}</strong> • Mode : {data.manuel ? 'Manuel' : 'Auto'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
