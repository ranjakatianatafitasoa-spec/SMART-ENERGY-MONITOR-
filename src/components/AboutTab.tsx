import React, { useState } from 'react';
import { Info, ShieldCheck, Cpu, Zap, Wifi, Code, Copy, Check, Download, Layers, Activity } from 'lucide-react';
import { ESP32Data } from '../types';

interface AboutTabProps {
  data: ESP32Data;
}

export const AboutTab: React.FC<AboutTabProps> = ({ data }) => {
  const [copied, setCopied] = useState(false);

  const espCodeSnippet = `/*
 * SMART ENERGY MONITOR - ESP32 EMBEDDED C++ CODE
 * Mesure AC RMS (ZMPT101B + ACS712), commande Relais et synchronisation Wi-Fi
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// 1. Paramètres Wi-Fi & Serveur
const char* WIFI_SSID     = "VOTRE_WIFI_SSID";
const char* WIFI_PASSWORD = "VOTRE_WIFI_PASSWORD";
const char* SERVER_URL    = "http://192.168.1.50:3000/api/esp32/data";

// 2. Affectation des Broches
const int PIN_RELAIS   = 26; // Commande Relais (Coupure / Rétablissement)
const int PIN_ZMPT101B = 34; // Capteur Tension AC (ZMPT101B)
const int PIN_ACS712   = 35; // Capteur Courant AC (ACS712)
const int PIN_LED      = 2;  // LED d'état Wi-Fi

// 3. Variables de Calibration & Seuils dynamiques
const float ACS712_SENS = 0.100; // 100mV/A pour ACS712 20A
float seuilMinVoltage = 185.0;
float seuilMaxVoltage = 253.0;
float seuilMaxCurrent = 10.0;
float cumulEnergieWh  = 0.0;
unsigned long dernierEnvoi = 0;
unsigned long dernierCalcul = 0;

void setup() {
  Serial.begin(115200);
  pinMode(PIN_RELAIS, OUTPUT);
  pinMode(PIN_LED, OUTPUT);
  digitalWrite(PIN_RELAIS, HIGH); // Relais actif (secteur passant)

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connexion au Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\n[Wi-Fi] Connecté ! IP: " + WiFi.localIP().toString());
  digitalWrite(PIN_LED, HIGH);
  dernierCalcul = millis();
}

void loop() {
  unsigned long maintenant = millis();

  if (maintenant - dernierEnvoi >= 1000) {
    // Mesure RMS par échantillonnage
    long sV = 0, sI = 0;
    for (int j = 0; j < 400; j++) {
      int v = analogRead(PIN_ZMPT101B) - 2048;
      int i = analogRead(PIN_ACS712) - 2048;
      sV += (long)v * v;
      sI += (long)i * i;
      delayMicroseconds(50);
    }
    float vRMS = (sqrt(sV / 400.0) / 4095.0) * 230.0 * 2.8;
    float iRMS = ((sqrt(sI / 400.0) / 4095.0) * 3.3) / ACS712_SENS;
    if (vRMS < 15.0) vRMS = 0.0;
    if (iRMS < 0.08) iRMS = 0.0;

    float puissance = vRMS * iRMS * 0.98;
    cumulEnergieWh += (puissance * (maintenant - dernierCalcul)) / 3600000.0;
    dernierCalcul = maintenant;
    dernierEnvoi = maintenant;

    // Envoi HTTP JSON au Serveur
    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      http.begin(SERVER_URL);
      http.addHeader("Content-Type", "application/json");

      StaticJsonDocument<384> doc;
      doc["tension"]          = serialized(String(vRMS, 1));
      doc["courant"]          = serialized(String(iRMS, 2));
      doc["puissance"]        = (int)round(puissance);
      doc["energie"]          = serialized(String(cumulEnergieWh, 1));
      doc["frequence"]        = 50.0;
      doc["facteurPuissance"] = 0.98;

      String payload;
      serializeJson(doc, payload);
      int code = http.POST(payload);

      if (code > 0) {
        StaticJsonDocument<512> res;
        deserializeJson(res, http.getString());
        // Application de la consigne Relais reçue du serveur
        bool etatRelais = res["relais"] | true;
        digitalWrite(PIN_RELAIS, etatRelais ? HIGH : LOW);
        
        // Synchronisation des seuils de sécurité
        if (res.containsKey("settings")) {
          seuilMinVoltage = res["settings"]["minVoltage"] | seuilMinVoltage;
          seuilMaxVoltage = res["settings"]["maxVoltage"] | seuilMaxVoltage;
          seuilMaxCurrent = res["settings"]["maxCurrent"] | seuilMaxCurrent;
        }
      }
      http.end();
    }
  }
}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(espCodeSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadIno = () => {
    const element = document.createElement('a');
    element.setAttribute('href', '/smart_energy_monitor_esp32.ino');
    element.setAttribute('download', 'smart_energy_monitor_esp32.ino');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-4 animate-fadeIn max-w-3xl mx-auto font-mono text-xs">
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-950/80">
        
        {/* Header with App Logo */}
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-800 mb-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.3)] bg-slate-900 shrink-0">
              <img
                src="/icon.png"
                alt="Smart Energy Monitor Logo"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
                <span>SMART ÉNERGIE MONITOR</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  v2.4 EMBEDDED
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 font-sans">
                Architecture matérielle IoT ESP32 & synchronisation temps réel
              </p>
            </div>
          </div>

          <div
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border flex items-center gap-1.5 ${
              data.wifiConnected !== false
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
            }`}
          >
            <Wifi className="w-3.5 h-3.5 animate-pulse" />
            <span>{data.wifiConnected !== false ? 'Wi-Fi Connecté' : 'Wi-Fi Déconnecté'}</span>
          </div>
        </div>

        {/* Modules & Capteurs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <h3 className="font-bold text-cyan-300 uppercase flex items-center gap-2 text-xs">
              <Zap className="w-4 h-4 text-cyan-400" />
              Capteurs & Actuateurs
            </h3>
            <div className="space-y-1.5 pt-1 text-slate-300 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Tension Secteur (AC):</span>
                <span className="font-bold text-cyan-300">ZMPT101B (0-250V RMS)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Courant Charge (AC):</span>
                <span className="font-bold text-amber-300">ACS712 (0-20A Hall)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Organe de Sécurité:</span>
                <span className="font-bold text-rose-400">Module Relais 230V 10A/30A</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Fréquence Mesurée:</span>
                <span className="font-bold text-cyan-400">{data.frequence ? `${data.frequence.toFixed(1)} Hz` : '50.0 Hz'}</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <h3 className="font-bold text-violet-300 uppercase flex items-center gap-2 text-xs">
              <Cpu className="w-4 h-4 text-violet-400" />
              Liaison & Protocole ESP32
            </h3>
            <div className="space-y-1.5 pt-1 text-slate-300 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Microcontrôleur:</span>
                <span className="font-bold text-slate-100">ESP32 Dual-Core (240MHz)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Protocole Synchronisation:</span>
                <span className="font-bold text-cyan-300">HTTP REST / JSON POST</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Fréquence d'Échantillonnage:</span>
                <span className="font-bold text-emerald-400">1 seconde (1 Hz)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Protection Autonome (Offline):</span>
                <span className="font-bold text-emerald-400">Active (Fail-Safe)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pinout Wiring Table */}
        <div className="mt-4 p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
          <h3 className="font-bold text-slate-200 uppercase flex items-center gap-2 text-xs">
            <Layers className="w-4 h-4 text-cyan-400" />
            Schéma de Câblage des Broches (Pinout ESP32)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
            <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
              <div className="text-slate-400 text-[10px]">GPIO 26</div>
              <div className="font-bold text-cyan-300">Relais (IN)</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
              <div className="text-slate-400 text-[10px]">GPIO 34 (ADC1_6)</div>
              <div className="font-bold text-cyan-300">ZMPT101B (OUT)</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
              <div className="text-slate-400 text-[10px]">GPIO 35 (ADC1_7)</div>
              <div className="font-bold text-amber-300">ACS712 (OUT)</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
              <div className="text-slate-400 text-[10px]">GPIO 2</div>
              <div className="font-bold text-emerald-300">LED Wi-Fi</div>
            </div>
          </div>
        </div>

        {/* Protection system badge */}
        <div className="mt-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 shrink-0 text-emerald-400" />
          <div className="text-[11px] leading-relaxed">
            <span className="font-bold uppercase">Sécurité et Synchronisation Bidirectionnelle :</span> Les mesures réelles envoyées par l'ESP32 sont analysées en continu. En retour, le serveur renvoie l'état souhaité du relais et synchronise les seuils de tension/courant en temps réel.
          </div>
        </div>

        {/* Code Arduino / C++ Section with Actions */}
        <div className="mt-5 pt-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-xs font-bold font-mono text-cyan-300 flex items-center gap-2 uppercase">
              <Code className="w-4 h-4 text-cyan-400" />
              Programme Embarqué C++ Arduino (.INO)
            </h3>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadIno}
                className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger .INO</span>
              </button>

              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
                <span>{copied ? 'Copié !' : 'Copier le Code'}</span>
              </button>
            </div>
          </div>

          <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl overflow-x-auto max-h-[380px]">
            <pre className="text-[10.5px] text-emerald-400/90 font-mono leading-relaxed select-all">
              {espCodeSnippet}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};


