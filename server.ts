import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

interface ESP32DataState {
  tension: number;
  courant: number;
  puissance: number;
  energie: number; // Wh
  frequence: number;
  facteurPuissance: number;
  puissanceApparente: number;
  temperatureBord: number;
  niveau: 'NORMAL' | 'ATTENTION' | 'DANGER';
  message: string;
  relais: boolean;
  manuel: boolean;
  rearmement: boolean;
  esp32Connected: boolean;
  lastEsp32Seen: number;
}

interface SystemSettingsState {
  minVoltage: number;
  maxVoltage: number;
  minCurrent: number;
  maxCurrent: number;
  soundAlerts: boolean;
}

const PORT = 3000;

let state: ESP32DataState = {
  tension: 228.4,
  courant: 2.15,
  puissance: 491,
  energie: 12.4,
  frequence: 50.0,
  facteurPuissance: 0.98,
  puissanceApparente: 501,
  temperatureBord: 36.2,
  niveau: 'NORMAL',
  message: 'Système nominal (Serveur Active)',
  relais: true,
  manuel: false,
  rearmement: true,
  esp32Connected: false,
  lastEsp32Seen: 0,
};

let settings: SystemSettingsState = {
  minVoltage: 185,
  maxVoltage: 253,
  minCurrent: 0,
  maxCurrent: 10,
  soundAlerts: true,
};

// Simulation phase accumulator for fallback when real ESP32 is not sending data
let simPhase = 0;
let simEnergy = 12.4;

async function startServer() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // CORS headers for local ESP32 HTTP requests
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Evaluate thresholds based on current values and settings
  function evaluateThresholds(v: number, i: number, rel: boolean) {
    let niveau: 'NORMAL' | 'ATTENTION' | 'DANGER' = 'NORMAL';
    let message = 'Système nominal';

    if (v === 0) {
      niveau = 'DANGER';
      message = 'Coupure secteur (0V) détectée';
    } else if (v > settings.maxVoltage) {
      niveau = 'DANGER';
      message = `Surtension secteur détectée (${v}V > ${settings.maxVoltage}V)`;
    } else if (v < settings.minVoltage) {
      niveau = 'ATTENTION';
      message = `Sous-tension secteur (${v}V < ${settings.minVoltage}V)`;
    } else if (i > settings.maxCurrent) {
      niveau = 'ATTENTION';
      message = `Surcharge courant (${i}A > ${settings.maxCurrent}A)`;
    }

    let finalRelais = rel;
    if (!state.manuel) {
      // In auto mode, cut relay on danger or high threshold violation
      finalRelais = niveau === 'NORMAL';
    }

    return { niveau, message, finalRelais };
  }

  // 1. GET /data & GET /api/data -> Main endpoint for web app frontend
  const handleGetData = (req: express.Request, res: express.Response) => {
    const isEspActive = Date.now() - state.lastEsp32Seen < 8000;
    state.esp32Connected = isEspActive;

    if (!isEspActive) {
      // Fallback simulation when no physical ESP32 is connected
      simPhase += 0.2;
      const noise = (Math.random() - 0.5) * 0.6;
      const rawV = Number((228.0 + Math.sin(simPhase * 0.2) * 2 + noise).toFixed(1));
      
      // If relay is cut off, current and active power drop to 0
      const isRelaisOpen = state.relais;
      const rawI = isRelaisOpen ? Number((Math.max(0, 2.12 + Math.sin(simPhase * 0.35) * 1.1 + noise * 0.2)).toFixed(2)) : 0;
      const pf = Number((0.97 + Math.random() * 0.02).toFixed(2));
      const p = Math.round(rawV * rawI * pf);
      simEnergy += p / 3600;

      const { niveau, message, finalRelais } = evaluateThresholds(rawV, rawI, state.relais);

      state.tension = rawV;
      state.courant = rawI;
      state.puissance = p;
      state.energie = Number(simEnergy.toFixed(1));
      state.frequence = Number((49.95 + Math.random() * 0.1).toFixed(2));
      state.facteurPuissance = pf;
      state.puissanceApparente = Math.round(rawV * rawI);
      state.temperatureBord = Number((35.5 + Math.random() * 1.2).toFixed(1));
      state.niveau = niveau;
      state.message = message;
      state.relais = finalRelais;
    }

    res.json({
      ...state,
      wifiConnected: true,
      settings,
    });
  };

  app.get('/data', handleGetData);
  app.get('/api/data', handleGetData);

  // 2. ESP32 Data Endpoint: POST /api/esp32/data or GET /update
  // ESP32 can send data via JSON POST or GET query params: /update?v=230.5&i=2.1&p=483
  const handleEsp32Ingest = (req: express.Request, res: express.Response) => {
    const body = req.body || {};
    const query = req.query || {};

    const v = Number(body.tension ?? body.v ?? query.v ?? query.tension ?? state.tension);
    const i = Number(body.courant ?? body.i ?? query.i ?? query.courant ?? state.courant);
    const p = Number(body.puissance ?? body.p ?? query.p ?? query.puissance ?? Math.round(v * i));
    const e = Number(body.energie ?? body.e ?? query.e ?? query.energie ?? state.energie);
    const freq = Number(body.frequence ?? body.f ?? query.f ?? query.frequence ?? 50.0);
    const pf = Number(body.facteurPuissance ?? body.pf ?? query.pf ?? query.facteurPuissance ?? 0.98);
    const temp = Number(body.temperatureBord ?? body.temp ?? query.temp ?? state.temperatureBord);

    state.lastEsp32Seen = Date.now();
    state.esp32Connected = true;

    state.tension = v;
    state.courant = i;
    state.puissance = p;
    state.energie = e;
    state.frequence = freq;
    state.facteurPuissance = pf;
    state.puissanceApparente = Math.round(v * i);
    state.temperatureBord = temp;

    const { niveau, message, finalRelais } = evaluateThresholds(v, i, state.relais);
    state.niveau = niveau;
    state.message = message;
    state.relais = finalRelais;

    res.json({
      status: 'ok',
      relais: state.relais,
      manuel: state.manuel,
      settings: {
        minVoltage: settings.minVoltage,
        maxVoltage: settings.maxVoltage,
        minCurrent: settings.minCurrent,
        maxCurrent: settings.maxCurrent,
      },
      serverTime: new Date().toISOString(),
    });
  };

  app.post('/api/esp32/data', handleEsp32Ingest);
  app.get('/update', handleEsp32Ingest);
  app.post('/update', handleEsp32Ingest);

  // 3. Relay Command Endpoint: GET /relais?etat=on|off|auto
  app.get('/relais', (req, res) => {
    const etat = (req.query.etat as string)?.toLowerCase();
    if (etat === 'on') {
      state.relais = true;
      state.manuel = true;
      state.message = 'Relais forcé ON (Manuel)';
    } else if (etat === 'off') {
      state.relais = false;
      state.manuel = true;
      state.message = 'Relais forcé OFF (Manuel)';
    } else if (etat === 'auto') {
      state.manuel = false;
      state.message = 'Mode Automatique réactivé';
      const { finalRelais, niveau, message } = evaluateThresholds(state.tension, state.courant, state.relais);
      state.relais = finalRelais;
      state.niveau = niveau;
      state.message = message;
    }

    res.json({
      status: 'ok',
      relais: state.relais,
      manuel: state.manuel,
      message: state.message,
    });
  });

  // 4. Calibration Endpoint: GET /calibrer
  app.get('/calibrer', (req, res) => {
    state.energie = 0;
    simEnergy = 0;
    res.json({ status: 'ok', message: 'Énergie réinitialisée / Capteurs recalibrés' });
  });

  // 5. Settings API Endpoints: GET/POST /api/settings
  app.get('/api/settings', (req, res) => {
    res.json(settings);
  });

  app.post('/api/settings', (req, res) => {
    const newSet = req.body || {};
    if (typeof newSet.minVoltage === 'number') settings.minVoltage = newSet.minVoltage;
    if (typeof newSet.maxVoltage === 'number') settings.maxVoltage = newSet.maxVoltage;
    if (typeof newSet.minCurrent === 'number') settings.minCurrent = newSet.minCurrent;
    if (typeof newSet.maxCurrent === 'number') settings.maxCurrent = newSet.maxCurrent;
    if (typeof newSet.soundAlerts === 'boolean') settings.soundAlerts = newSet.soundAlerts;

    // Immediately evaluate thresholds with updated settings
    const { niveau, message, finalRelais } = evaluateThresholds(state.tension, state.courant, state.relais);
    state.niveau = niveau;
    state.message = message;
    state.relais = finalRelais;

    res.json({ status: 'ok', settings, state });
  });

  // 6. Provide ESP32 C++ Code snippet endpoint
  app.get('/api/esp32/code', (req, res) => {
    const host = req.get('host') || 'localhost:3000';
    const proto = req.protocol || 'http';
    const code = `#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// --- Configuration Wi-Fi ---
const char* ssid     = "VOTRE_WIFI_SSID";
const char* password = "VOTRE_WIFI_PASSWORD";

// --- Configuration Serveur API ---
const char* serverUrl = "${proto}://${host}/api/esp32/data";

// --- Pins Matériel ---
const int RELAY_PIN = 26;   // Pin de commande du Relais
const int VOLT_PIN  = 34;   // Pin Capteur Tension (ZMPT101B / PZEM)
const int CURR_PIN  = 35;   // Pin Capteur Courant (ACS712)

// --- Seuils configurés reçus du serveur ---
float minVoltage = 185.0;
float maxVoltage = 253.0;
float maxCurrent = 10.0;

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH); // Actif par défaut

  WiFi.begin(ssid, password);
  Serial.print("Connexion au Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\nWi-Fi connecté ! IP: " + WiFi.localIP().toString());
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    // 1. Lecture des capteurs
    int rawV = analogRead(VOLT_PIN);
    int rawI = analogRead(CURR_PIN);
    float tension = (rawV / 4095.0) * 230.0; // Ajuster selon votre étalonnage
    float courant = (rawI / 4095.0) * 5.0;

    // 2. Préparation du JSON pour l'envoi
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    StaticJsonDocument<256> doc;
    doc["tension"] = tension;
    doc["courant"] = courant;
    doc["puissance"] = tension * courant;

    String requestBody;
    serializeJson(doc, requestBody);

    int httpResponseCode = http.POST(requestBody);

    if (httpResponseCode > 0) {
      String response = http.getString();
      StaticJsonDocument<512> resDoc;
      deserializeJson(resDoc, response);

      // 3. Application de la commande Relais renvoyée par le serveur
      bool relaisEtat = resDoc["relais"] | true;
      digitalWrite(RELAY_PIN, relaisEtat ? HIGH : LOW);

      // 4. Synchronisation des seuils de sécurité configurés
      minVoltage = resDoc["settings"]["minVoltage"] | minVoltage;
      maxVoltage = resDoc["settings"]["maxVoltage"] | maxVoltage;
      maxCurrent = resDoc["settings"]["maxCurrent"] | maxCurrent;

      Serial.printf("Envoyé: %.1fV, %.2fA -> Relais: %s\\n", tension, courant, relaisEtat ? "ON" : "OFF");
    } else {
      Serial.printf("Erreur d'envoi HTTP: %d\\n", httpResponseCode);
    }
    http.end();
  }
  delay(1000); // Poll toutes les secondes
}
`;
    res.type('text/plain').send(code);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur prêt sur http://localhost:${PORT}`);
  });
}

startServer();
