import React, { useState } from 'react';
import { Info, ShieldCheck, Cpu, Zap, Wifi, Code, Copy, Check } from 'lucide-react';
import { ESP32Data } from '../types';

interface AboutTabProps {
  data: ESP32Data;
}

export const AboutTab: React.FC<AboutTabProps> = ({ data }) => {
  const [copied, setCopied] = useState(false);

  const espCodeSnippet = `#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid     = "VOTRE_WIFI_SSID";
const char* password = "VOTRE_WIFI_PASSWORD";

// URL de l'API Smart Energy Monitor
const char* serverUrl = "http://VOTRE_SERVEUR_IP:3000/api/esp32/data";

// --- MATÉRIEL PRÉVU ---
const int RELAY_PIN    = 26; // Module Relais 5V/230V
const int ZMPT101_PIN  = 34; // Capteur Tension ZMPT101B
const int ACS712_PIN   = 35; // Capteur Courant ACS712

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); }
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    // Lecture des capteurs ZMPT101B et ACS712
    float tension = (analogRead(ZMPT101_PIN) / 4095.0) * 250.0; // ZMPT101B
    float courant = (analogRead(ACS712_PIN) / 4095.0) * 10.0;   // ACS712

    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    StaticJsonDocument<256> doc;
    doc["tension"] = tension;
    doc["courant"] = courant;
    doc["puissance"] = tension * courant;

    String jsonStr;
    serializeJson(doc, jsonStr);
    int httpCode = http.POST(jsonStr);

    if (httpCode > 0) {
      String payload = http.getString();
      StaticJsonDocument<512> resDoc;
      deserializeJson(resDoc, payload);

      // Pilotage automatique du Relais selon les seuils du serveur
      bool relais = resDoc["relais"] | true;
      digitalWrite(RELAY_PIN, relais ? HIGH : LOW);
    }
    http.end();
  }
  delay(1000);
}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(espCodeSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 animate-fadeIn max-w-3xl mx-auto font-mono text-xs">
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-950/80">
        <div className="flex items-center justify-between gap-2.5 pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-100">
                ARCHITECTURE MATÉRIELLE & INTÉGRATION SANS FIL
              </h2>
            </div>
          </div>

          <div
            className={`px-3 py-1 rounded-xl text-[11px] font-bold border flex items-center gap-1.5 ${
              data.wifiConnected !== false
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
            }`}
          >
            <Wifi className="w-3.5 h-3.5 animate-pulse" />
            <span>{data.wifiConnected !== false ? 'Wi-Fi Connecté' : 'Wi-Fi Déconnecté'}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <h3 className="font-bold text-cyan-300 uppercase flex items-center gap-2 text-xs">
              <Zap className="w-4 h-4 text-cyan-400" />
              Capteurs & Actuateurs
            </h3>
            <div className="space-y-1.5 pt-1 text-slate-300 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Capteur Tension:</span>
                <span className="font-bold text-slate-100">ZMPT101B (AC)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Capteur Courant:</span>
                <span className="font-bold text-amber-400">ACS712 (Hall)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Organe Coupure:</span>
                <span className="font-bold text-rose-400">Relais Electromécanique</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Fréquence Réseau:</span>
                <span className="font-bold text-cyan-400">{data.frequence ? `${data.frequence.toFixed(1)} Hz` : '50.0 Hz'}</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <h3 className="font-bold text-violet-300 uppercase flex items-center gap-2 text-xs">
              <Cpu className="w-4 h-4 text-violet-400" />
              Liaison Réseau Wi-Fi
            </h3>
            <div className="space-y-1.5 pt-1 text-slate-300 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Protocole:</span>
                <span className="font-bold text-slate-100">HTTP / JSON</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Délai Scrutation:</span>
                <span className="font-bold text-cyan-400">1 seconde</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Synchronisation:</span>
                <span className="font-bold text-emerald-400">Automatique</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">État Réseau:</span>
                <span className="font-bold text-emerald-400">Supervisé</span>
              </div>
            </div>
          </div>
        </div>

        {/* Protection system badge */}
        <div className="mt-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 shrink-0 text-emerald-400" />
          <div className="text-[11px] leading-relaxed">
            <span className="font-bold uppercase">Protection en Temps Réel :</span> Les mesures issues des capteurs ZMPT101B et ACS712 sont transmises au serveur. Dès qu'un dépassement des seuils configurés est détecté, la commande de coupure est transmise au Relais.
          </div>
        </div>

        {/* Code Arduino / C++ Section */}
        <div className="mt-5 pt-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold font-mono text-cyan-300 flex items-center gap-2 uppercase">
              <Code className="w-4 h-4 text-cyan-400" />
              Programme C++ Arduino (ZMPT101B + ACS712 + Relais)
            </h3>
            <button
              onClick={handleCopy}
              className="px-3 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{copied ? 'Copié !' : 'Copier le Code C++'}</span>
            </button>
          </div>

          <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl overflow-x-auto">
            <pre className="text-[10px] text-emerald-400/90 font-mono leading-relaxed select-all">
              {espCodeSnippet}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

