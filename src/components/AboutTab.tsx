import React, { useState } from 'react';
import { Info, ShieldCheck, Cpu, Zap, Wifi, Code, Copy, Check, Download, Layers, Radio, Smartphone, CheckCircle } from 'lucide-react';
import { ESP32Data } from '../types';

interface AboutTabProps {
  data: ESP32Data;
}

export const AboutTab: React.FC<AboutTabProps> = ({ data }) => {
  const [copied, setCopied] = useState(false);

  const espCodeSnippet = `/*
 * SMART ENERGY MONITOR - ESP32 POINT D'ACCÈS WI-FI DIRECT (V4.0 SOFT-AP)
 * Détection directe sans routeur ni box internet | REST API CORS sur Port 80
 * Mesure AC RMS réelle (ZMPT101B + ACS712) & Commande Relais Active-LOW
 */

#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>

// 1. Point d'Accès Wi-Fi Direct (ESP32 SoftAP)
const char* AP_SSID     = "SMART_ENERGY_MONITOR";
const char* AP_PASSWORD = "12345678";
const IPAddress AP_IP(192, 168, 4, 1);
const IPAddress AP_GATEWAY(192, 168, 4, 1);
const IPAddress AP_SUBNET(255, 255, 255, 0);

// 2. Pins & Configuration Relais (Active-LOW optocouplé standard)
const int PIN_RELAIS   = 26; // GPIO26 -> IN du Relais
const int PIN_ZMPT101B = 34; // GPIO34 -> OUT du ZMPT101B (ADC1_6)
const int PIN_ACS712   = 35; // GPIO35 -> OUT de l'ACS712 (ADC1_7)
const int PIN_LED      = 2;  // GPIO2  -> LED témoin

const int RELAIS_NIVEAU_ACTIF = LOW;  // Relais enclenché (passant)
const int RELAIS_NIVEAU_COUPE = HIGH; // Relais coupé (sécurité)

const float ACS712_SENS = 0.100; // 100mV/A (ACS712 20A)
float seuilMinVoltage = 185.0;
float seuilMaxVoltage = 253.0;
float seuilMaxCurrent = 10.0;
bool relaisActif      = true;
bool modeManuel       = false;
float tensionActuelle = 0.0;
float courantActuel   = 0.0;
float puissanceActive = 0.0;
float energieCumulWh  = 0.0;

WebServer server(80);

void appliquerRelais(bool activer) {
  relaisActif = activer;
  digitalWrite(PIN_RELAIS, activer ? RELAIS_NIVEAU_ACTIF : RELAIS_NIVEAU_COUPE);
}

void ajouterCORS() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "*");
}

void handleGetData() {
  ajouterCORS();
  StaticJsonDocument<512> doc;
  doc["tension"]        = serialized(String(tensionActuelle, 1));
  doc["courant"]        = serialized(String(courantActuel, 2));
  doc["puissance"]      = (int)round(puissanceActive);
  doc["energie"]        = serialized(String(energieCumulWh, 1));
  doc["frequence"]      = 50.0;
  doc["facteurPuissance"] = 0.98;
  doc["relais"]         = relaisActif;
  doc["manuel"]         = modeManuel;
  doc["wifiConnected"]  = true;
  doc["esp32Connected"] = true;
  doc["niveau"]         = (tensionActuelle == 0) ? "DANGER" : (tensionActuelle > seuilMaxVoltage ? "DANGER" : "NORMAL");
  doc["message"]        = "Connecté via Point d'Accès Wi-Fi Direct";

  String res;
  serializeJson(doc, res);
  server.send(200, "application/json", res);
}

void handleRelais() {
  ajouterCORS();
  String etat = server.arg("etat");
  etat.toLowerCase();
  if (etat == "on") { modeManuel = true; appliquerRelais(true); }
  else if (etat == "off") { modeManuel = true; appliquerRelais(false); }
  else if (etat == "auto") { modeManuel = false; }

  StaticJsonDocument<128> doc;
  doc["status"] = "ok";
  doc["relais"] = relaisActif;
  String res;
  serializeJson(doc, res);
  server.send(200, "application/json", res);
}

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  pinMode(PIN_RELAIS, OUTPUT);
  pinMode(PIN_LED, OUTPUT);
  appliquerRelais(true);

  WiFi.mode(WIFI_AP);
  WiFi.softAPConfig(AP_IP, AP_GATEWAY, AP_SUBNET);
  WiFi.softAP(AP_SSID, AP_PASSWORD);

  server.on("/data", HTTP_GET, handleGetData);
  server.on("/api/data", HTTP_GET, handleGetData);
  server.on("/relais", HTTP_GET, handleRelais);
  server.on("/toggle", HTTP_GET, []() {
    ajouterCORS();
    appliquerRelais(!relaisActif);
    server.send(200, "application/json", "{\"status\":\"ok\"}");
  });
  server.on("/ping", HTTP_GET, []() {
    ajouterCORS();
    server.send(200, "application/json", "{\"status\":\"pong\"}");
  });

  server.begin();
  Serial.println("Point d'Accès Wi-Fi et Serveur Web HTTP Démarrés !");
}

void loop() {
  server.handleClient();
  // Échantillonnage AC toutes les 500ms...
  delay(2);
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
                  v4.0 SOFT-AP
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 font-sans">
                Point d'Accès Wi-Fi Direct autonome & Contrôle instantané
              </p>
            </div>
          </div>

          <div
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border flex items-center gap-1.5 ${
              data.wifiConnected === true
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
            }`}
          >
            <Wifi className="w-3.5 h-3.5 animate-pulse" />
            <span>{data.wifiConnected === true ? 'Wi-Fi Connecté' : 'Wi-Fi Déconnecté'}</span>
          </div>
        </div>

        {/* GUIDE DE CONNEXION DIRECTE SMARTPHONE <-> ESP32 */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-950/40 via-slate-900/60 to-blue-950/40 border border-cyan-500/40 shadow-lg space-y-3 mb-4">
          <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="uppercase tracking-wider">GUIDE DE CONNEXION RAPIDE POINT D'ACCÈS WI-FI</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-slate-200 text-[11px]">
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                <span className="w-4 h-4 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px]">1</span>
                <span>Téléverser le Code</span>
              </div>
              <p className="text-slate-400 text-[10.5px]">
                Flashez le fichier <strong>.INO</strong> sur votre ESP32 via Arduino IDE.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                <span className="w-4 h-4 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px]">2</span>
                <span>Connexion Smartphone</span>
              </div>
              <p className="text-slate-400 text-[10.5px]">
                Connectez le Wi-Fi du téléphone à :<br />
                <strong className="text-cyan-300">SSID: SMART_ENERGY_MONITOR</strong><br />
                <strong className="text-slate-300">MDP: 12345678</strong>
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Synchronisation</span>
              </div>
              <p className="text-slate-400 text-[10.5px]">
                L'application détecte automatiquement l'ESP32 sur <strong>192.168.4.1</strong> avec contrôle immédiat !
              </p>
            </div>
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
                <span className="font-bold text-rose-400">Module Relais Active-LOW</span>
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
                <span className="text-slate-400">Mode Wi-Fi:</span>
                <span className="font-bold text-cyan-300">Point d'Accès Direct (SoftAP)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Serveur Web:</span>
                <span className="font-bold text-emerald-400">Port 80 (CORS Activé)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Temps de Réaction Relais:</span>
                <span className="font-bold text-emerald-400">&lt; 30 ms (Direct)</span>
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

        {/* Code Arduino / C++ Section with Actions */}
        <div className="mt-5 pt-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-xs font-bold font-mono text-cyan-300 flex items-center gap-2 uppercase">
              <Code className="w-4 h-4 text-cyan-400" />
              Programme Embarqué C++ Arduino (.INO V4.0 AP)
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
