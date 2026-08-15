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
  function evaluateThresholds(v: number, i: number, rel: boolean, manuel: boolean) {
    let niveau: 'NORMAL' | 'ATTENTION' | 'DANGER' = 'NORMAL';
    let message = 'Système nominal';

    if (v === 0) {
      niveau = 'DANGER';
      message = 'Coupure secteur (0V) détectée';
    } else if (v > settings.maxVoltage) {
      niveau = 'DANGER';
      message = `Surtension secteur critique (${v.toFixed(1)}V > ${settings.maxVoltage}V) — Protection active`;
    } else if (v < settings.minVoltage) {
      niveau = 'ATTENTION';
      message = `Sous-tension secteur anormale (${v.toFixed(1)}V < ${settings.minVoltage}V) — Protection active`;
    } else if (i > settings.maxCurrent) {
      niveau = 'ATTENTION';
      message = `Surcharge courant (${i.toFixed(2)}A > ${settings.maxCurrent}A) — Protection active`;
    }

    let finalRelais = rel;
    if (!manuel) {
      // In auto mode, cut relay on any danger or safety violation
      if (niveau === 'NORMAL') {
        finalRelais = true;
      } else {
        finalRelais = false;
      }
    }

    return { niveau, message, finalRelais };
  }

  // 1. GET /data & GET /api/data -> Main endpoint for web app frontend
  const handleGetData = (req: express.Request, res: express.Response) => {
    // A physical ESP32 is considered active if it sent an HTTP heartbeat within the last 4 seconds
    const isEspActive = (Date.now() - state.lastEsp32Seen < 4000) && state.lastEsp32Seen > 0;
    state.esp32Connected = isEspActive;

    const isSimulate = req.query.simulate === 'true';

    if (!isEspActive) {
      // Continuous realistic live electrical cycle when no physical ESP32 is actively streaming
      simPhase += 0.25;
      const noise = (Math.random() - 0.5) * 0.8;
      let rawV = Number((229.0 + Math.sin(simPhase * 0.2) * 2.2 + noise).toFixed(1));

      // Check if simulated fault was requested
      if (req.query.fault === 'outage') {
        rawV = 0;
      } else if (req.query.fault === 'overvoltage') {
        rawV = 264.5;
      }

      // Check thresholds and calculate relay state
      const { niveau, message, finalRelais } = evaluateThresholds(rawV, state.courant, state.relais, state.manuel);
      state.relais = finalRelais;
      state.niveau = niveau;
      state.message = message;

      // Current only flows if relay is ON and voltage is present
      const rawI = state.relais && rawV > 0
        ? Number((Math.max(0.1, 2.15 + Math.sin(simPhase * 0.35) * 0.6 + (Math.random() - 0.5) * 0.15)).toFixed(2))
        : 0;

      const pf = Number((0.98 + (Math.random() - 0.5) * 0.02).toFixed(2));
      const p = Math.round(rawV * rawI * pf);
      simEnergy += (p / 3600);

      state.tension = rawV;
      state.courant = rawI;
      state.puissance = p;
      state.puissanceApparente = Math.round(rawV * rawI);
      state.energie = Number(simEnergy.toFixed(2));
      state.frequence = Number((49.95 + Math.random() * 0.1).toFixed(2));
      state.facteurPuissance = pf;
      state.temperatureBord = Number((34.5 + Math.random() * 0.8).toFixed(1));
    }

    res.json({
      ...state,
      wifiConnected: true,
      esp32Connected: isEspActive,
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

    const { niveau, message, finalRelais } = evaluateThresholds(v, i, state.relais, state.manuel);
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

  // 3. Relay Command Endpoint: GET/POST /relais & /api/relais
  const handleRelayCommand = (req: express.Request, res: express.Response) => {
    const etat = (req.query.etat as string || req.body.etat as string || (req.body.relais === true ? 'on' : req.body.relais === false ? 'off' : ''))?.toLowerCase();
    
    if (etat === 'on' || etat === '1' || etat === 'true') {
      state.relais = true;
      state.manuel = true;
      state.message = 'Relais forcé ON (Mode Manuel Actif)';
      if (state.tension > 0 && state.courant === 0) {
        state.courant = 2.15;
        state.puissance = Math.round(state.tension * 2.15 * state.facteurPuissance);
      }
    } else if (etat === 'off' || etat === '0' || etat === 'false') {
      state.relais = false;
      state.manuel = true;
      state.courant = 0;
      state.puissance = 0;
      state.puissanceApparente = 0;
      state.message = 'Relais forcé OFF (Mode Manuel Actif - Sortie Coupée)';
    } else if (etat === 'auto') {
      state.manuel = false;
      state.message = 'Mode Automatique réactivé — Protection asservie aux seuils';
      const { finalRelais, niveau, message } = evaluateThresholds(state.tension, state.courant, state.relais, false);
      state.relais = finalRelais;
      state.niveau = niveau;
      state.message = message;
      if (!finalRelais) {
        state.courant = 0;
        state.puissance = 0;
      }
    }

    console.log(`[SERVEUR] Commande relais reçue: ${etat || 'status'} -> Relais=${state.relais ? 'ON' : 'OFF'}, Manuel=${state.manuel}`);

    res.json({
      status: 'ok',
      relais: state.relais,
      manuel: state.manuel,
      message: state.message,
      state,
    });
  };

  app.get('/relais', handleRelayCommand);
  app.post('/relais', handleRelayCommand);
  app.get('/api/relais', handleRelayCommand);
  app.post('/api/relais', handleRelayCommand);

  // 4. Calibration Endpoint: GET/POST /calibrer
  const handleCalibrate = (req: express.Request, res: express.Response) => {
    state.energie = 0;
    simEnergy = 0;
    console.log('[SERVEUR] Énergie réinitialisée et capteurs recalibrés');
    res.json({ status: 'ok', message: 'Énergie réinitialisée / Capteurs recalibrés avec succès' });
  };
  app.get('/calibrer', handleCalibrate);
  app.post('/calibrer', handleCalibrate);
  app.get('/api/calibrer', handleCalibrate);

  // 5. Settings API Endpoints: GET/POST /api/settings & /settings
  const handleGetSettings = (req: express.Request, res: express.Response) => {
    res.json({
      status: 'ok',
      settings,
      message: 'Seuils de sécurité actuellement fixés sur le serveur',
    });
  };

  const handlePostSettings = (req: express.Request, res: express.Response) => {
    const newSet = req.body || {};
    const query = req.query || {};

    const minV = Number(newSet.minVoltage ?? query.minVoltage);
    const maxV = Number(newSet.maxVoltage ?? query.maxVoltage);
    const minI = Number(newSet.minCurrent ?? query.minCurrent);
    const maxI = Number(newSet.maxCurrent ?? query.maxCurrent);
    const sound = newSet.soundAlerts !== undefined ? Boolean(newSet.soundAlerts) : (query.soundAlerts !== undefined ? query.soundAlerts === 'true' : undefined);

    if (!isNaN(minV) && minV > 50 && minV < 300) settings.minVoltage = minV;
    if (!isNaN(maxV) && maxV > 150 && maxV < 400) settings.maxVoltage = maxV;
    if (!isNaN(minI) && minI >= 0) settings.minCurrent = minI;
    if (!isNaN(maxI) && maxI > 0 && maxI < 100) settings.maxCurrent = maxI;
    if (sound !== undefined) settings.soundAlerts = sound;

    // Immediately evaluate thresholds with the newly fixed threshold values
    const { niveau, message, finalRelais } = evaluateThresholds(state.tension, state.courant, state.relais, state.manuel);
    state.niveau = niveau;
    state.message = message;
    state.relais = finalRelais;
    if (!finalRelais) {
      state.courant = 0;
      state.puissance = 0;
    }

    console.log(`[SERVEUR] Nouveaux seuils fixés: MinV=${settings.minVoltage}V, MaxV=${settings.maxVoltage}V, MaxI=${settings.maxCurrent}A, Sound=${settings.soundAlerts}`);

    res.json({
      status: 'ok',
      message: `Nouveaux seuils enregistrés et fixés avec succès (Min: ${settings.minVoltage}V, Max: ${settings.maxVoltage}V, Courant Max: ${settings.maxCurrent}A)`,
      settings,
      state,
    });
  };

  app.get('/api/settings', handleGetSettings);
  app.get('/settings', handleGetSettings);
  app.post('/api/settings', handlePostSettings);
  app.post('/settings', handlePostSettings);

  // 6. Provide ESP32 C++ Code download and snippet endpoint
  app.get('/smart_energy_monitor_esp32.ino', (req, res) => {
    const inoPath = path.join(process.cwd(), 'public', 'smart_energy_monitor_esp32.ino');
    res.download(inoPath, 'smart_energy_monitor_esp32.ino');
  });

  app.get('/api/esp32/code', (req, res) => {
    const host = req.get('host') || 'localhost:3000';
    const proto = req.protocol || 'http';
    const inoPath = path.join(process.cwd(), 'public', 'smart_energy_monitor_esp32.ino');
    try {
      const fs = require('fs');
      let code = fs.readFileSync(inoPath, 'utf8');
      code = code.replace('http://192.168.1.50:3000/api/esp32/data', `${proto}://${host}/api/esp32/data`);
      res.type('text/plain').send(code);
    } catch {
      res.redirect('/smart_energy_monitor_esp32.ino');
    }
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
