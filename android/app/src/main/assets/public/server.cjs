var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var PORT = 3e3;
var state = {
  tension: 0,
  courant: 0,
  puissance: 0,
  energie: 0,
  frequence: 0,
  facteurPuissance: 0,
  puissanceApparente: 0,
  temperatureBord: 28,
  niveau: "ATTENTION",
  message: "En attente de connexion du module ESP32 (Wi-Fi d\xE9connect\xE9)",
  relais: true,
  manuel: false,
  rearmement: true,
  esp32Connected: false,
  lastEsp32Seen: 0
};
var settings = {
  minVoltage: 185,
  maxVoltage: 253,
  minCurrent: 0,
  maxCurrent: 10,
  soundAlerts: true
};
var simPhase = 0;
var simEnergy = 0;
async function startServer() {
  const app = (0, import_express.default)();
  app.use(import_express.default.json());
  app.use(import_express.default.urlencoded({ extended: true }));
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });
  function evaluateThresholds(v, i, rel, manuel) {
    let niveau = "NORMAL";
    let message = "Syst\xE8me nominal";
    if (v === 0) {
      niveau = "DANGER";
      message = "Coupure secteur (0V) d\xE9tect\xE9e";
    } else if (v > settings.maxVoltage) {
      niveau = "DANGER";
      message = `Surtension secteur critique (${v.toFixed(1)}V > ${settings.maxVoltage}V) \u2014 Protection active`;
    } else if (v < settings.minVoltage) {
      niveau = "ATTENTION";
      message = `Sous-tension secteur anormale (${v.toFixed(1)}V < ${settings.minVoltage}V) \u2014 Protection active`;
    } else if (i > settings.maxCurrent) {
      niveau = "ATTENTION";
      message = `Surcharge courant (${i.toFixed(2)}A > ${settings.maxCurrent}A) \u2014 Protection active`;
    }
    let finalRelais = rel;
    if (!manuel) {
      if (niveau === "NORMAL") {
        finalRelais = true;
      } else {
        finalRelais = false;
      }
    }
    return { niveau, message, finalRelais };
  }
  const handleGetData = (req, res) => {
    const isEspActive = Date.now() - state.lastEsp32Seen < 4e3 && state.lastEsp32Seen > 0;
    state.esp32Connected = isEspActive;
    const isSimulate = req.query.simulate === "true";
    if (isSimulate) {
      simPhase += 0.25;
      const noise = (Math.random() - 0.5) * 0.8;
      let rawV = Number((229 + Math.sin(simPhase * 0.2) * 2.2 + noise).toFixed(1));
      if (req.query.fault === "outage") {
        rawV = 0;
      } else if (req.query.fault === "overvoltage") {
        rawV = 264.5;
      }
      const { niveau, message, finalRelais } = evaluateThresholds(rawV, state.courant, state.relais, state.manuel);
      state.relais = finalRelais;
      state.niveau = niveau;
      state.message = message;
      const rawI = state.relais && rawV > 0 ? Number(Math.max(0.1, 2.15 + Math.sin(simPhase * 0.35) * 0.6 + (Math.random() - 0.5) * 0.15).toFixed(2)) : 0;
      const pf = Number((0.98 + (Math.random() - 0.5) * 0.02).toFixed(2));
      const p = Math.round(rawV * rawI * pf);
      simEnergy += p / 3600;
      state.tension = rawV;
      state.courant = rawI;
      state.puissance = p;
      state.puissanceApparente = Math.round(rawV * rawI);
      state.energie = Number(simEnergy.toFixed(2));
      state.frequence = Number((49.95 + Math.random() * 0.1).toFixed(2));
      state.facteurPuissance = pf;
      state.temperatureBord = Number((34.5 + Math.random() * 0.8).toFixed(1));
    } else if (!isEspActive) {
      state.tension = 0;
      state.courant = 0;
      state.puissance = 0;
      state.puissanceApparente = 0;
      state.frequence = 0;
      state.facteurPuissance = 0;
      state.niveau = "ATTENTION";
      state.message = "En attente de connexion du module ESP32 (Wi-Fi d\xE9connect\xE9)";
    }
    res.json({
      ...state,
      wifiConnected: isEspActive || isSimulate,
      esp32Connected: isEspActive,
      settings
    });
  };
  app.get("/data", handleGetData);
  app.get("/api/data", handleGetData);
  const handleEsp32Ingest = (req, res) => {
    const body = req.body || {};
    const query = req.query || {};
    const v = Number(body.tension ?? body.v ?? query.v ?? query.tension ?? state.tension);
    const i = Number(body.courant ?? body.i ?? query.i ?? query.courant ?? state.courant);
    const p = Number(body.puissance ?? body.p ?? query.p ?? query.puissance ?? Math.round(v * i));
    const e = Number(body.energie ?? body.e ?? query.e ?? query.energie ?? state.energie);
    const freq = Number(body.frequence ?? body.f ?? query.f ?? query.frequence ?? 50);
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
      status: "ok",
      relais: state.relais,
      manuel: state.manuel,
      settings: {
        minVoltage: settings.minVoltage,
        maxVoltage: settings.maxVoltage,
        minCurrent: settings.minCurrent,
        maxCurrent: settings.maxCurrent
      },
      serverTime: (/* @__PURE__ */ new Date()).toISOString()
    });
  };
  app.post("/api/esp32/data", handleEsp32Ingest);
  app.get("/update", handleEsp32Ingest);
  app.post("/update", handleEsp32Ingest);
  const handleRelayCommand = (req, res) => {
    const etat = (req.query.etat || req.body.etat || (req.body.relais === true ? "on" : req.body.relais === false ? "off" : ""))?.toLowerCase();
    if (etat === "on" || etat === "1" || etat === "true") {
      state.relais = true;
      state.manuel = true;
      state.message = "Relais forc\xE9 ON (Mode Manuel Actif)";
      if (state.tension > 0 && state.courant === 0) {
        state.courant = 2.15;
        state.puissance = Math.round(state.tension * 2.15 * state.facteurPuissance);
      }
    } else if (etat === "off" || etat === "0" || etat === "false") {
      state.relais = false;
      state.manuel = true;
      state.courant = 0;
      state.puissance = 0;
      state.puissanceApparente = 0;
      state.message = "Relais forc\xE9 OFF (Mode Manuel Actif - Sortie Coup\xE9e)";
    } else if (etat === "auto") {
      state.manuel = false;
      state.message = "Mode Automatique r\xE9activ\xE9 \u2014 Protection asservie aux seuils";
      const { finalRelais, niveau, message } = evaluateThresholds(state.tension, state.courant, state.relais, false);
      state.relais = finalRelais;
      state.niveau = niveau;
      state.message = message;
      if (!finalRelais) {
        state.courant = 0;
        state.puissance = 0;
      }
    }
    console.log(`[SERVEUR] Commande relais re\xE7ue: ${etat || "status"} -> Relais=${state.relais ? "ON" : "OFF"}, Manuel=${state.manuel}`);
    res.json({
      status: "ok",
      relais: state.relais,
      manuel: state.manuel,
      message: state.message,
      state
    });
  };
  app.get("/relais", handleRelayCommand);
  app.post("/relais", handleRelayCommand);
  app.get("/api/relais", handleRelayCommand);
  app.post("/api/relais", handleRelayCommand);
  const handleCalibrate = (req, res) => {
    state.energie = 0;
    simEnergy = 0;
    console.log("[SERVEUR] \xC9nergie r\xE9initialis\xE9e et capteurs recalibr\xE9s");
    res.json({ status: "ok", message: "\xC9nergie r\xE9initialis\xE9e / Capteurs recalibr\xE9s avec succ\xE8s" });
  };
  app.get("/calibrer", handleCalibrate);
  app.post("/calibrer", handleCalibrate);
  app.get("/api/calibrer", handleCalibrate);
  const handleGetSettings = (req, res) => {
    res.json({
      status: "ok",
      settings,
      message: "Seuils de s\xE9curit\xE9 actuellement fix\xE9s sur le serveur"
    });
  };
  const handlePostSettings = (req, res) => {
    const newSet = req.body || {};
    const query = req.query || {};
    const minV = Number(newSet.minVoltage ?? query.minVoltage);
    const maxV = Number(newSet.maxVoltage ?? query.maxVoltage);
    const minI = Number(newSet.minCurrent ?? query.minCurrent);
    const maxI = Number(newSet.maxCurrent ?? query.maxCurrent);
    const sound = newSet.soundAlerts !== void 0 ? Boolean(newSet.soundAlerts) : query.soundAlerts !== void 0 ? query.soundAlerts === "true" : void 0;
    if (!isNaN(minV) && minV > 50 && minV < 300) settings.minVoltage = minV;
    if (!isNaN(maxV) && maxV > 150 && maxV < 400) settings.maxVoltage = maxV;
    if (!isNaN(minI) && minI >= 0) settings.minCurrent = minI;
    if (!isNaN(maxI) && maxI > 0 && maxI < 100) settings.maxCurrent = maxI;
    if (sound !== void 0) settings.soundAlerts = sound;
    const { niveau, message, finalRelais } = evaluateThresholds(state.tension, state.courant, state.relais, state.manuel);
    state.niveau = niveau;
    state.message = message;
    state.relais = finalRelais;
    if (!finalRelais) {
      state.courant = 0;
      state.puissance = 0;
    }
    console.log(`[SERVEUR] Nouveaux seuils fix\xE9s: MinV=${settings.minVoltage}V, MaxV=${settings.maxVoltage}V, MaxI=${settings.maxCurrent}A, Sound=${settings.soundAlerts}`);
    res.json({
      status: "ok",
      message: `Nouveaux seuils enregistr\xE9s et fix\xE9s avec succ\xE8s (Min: ${settings.minVoltage}V, Max: ${settings.maxVoltage}V, Courant Max: ${settings.maxCurrent}A)`,
      settings,
      state
    });
  };
  app.get("/api/settings", handleGetSettings);
  app.get("/settings", handleGetSettings);
  app.post("/api/settings", handlePostSettings);
  app.post("/settings", handlePostSettings);
  app.get("/smart_energy_monitor_esp32.ino", (req, res) => {
    const inoPath = import_path.default.join(process.cwd(), "public", "smart_energy_monitor_esp32.ino");
    res.download(inoPath, "smart_energy_monitor_esp32.ino");
  });
  app.get("/api/esp32/code", (req, res) => {
    const host = req.get("host") || "localhost:3000";
    const proto = req.protocol || "http";
    const inoPath = import_path.default.join(process.cwd(), "public", "smart_energy_monitor_esp32.ino");
    try {
      const fs = require("fs");
      let code = fs.readFileSync(inoPath, "utf8");
      code = code.replace("http://192.168.1.50:3000/api/esp32/data", `${proto}://${host}/api/esp32/data`);
      res.type("text/plain").send(code);
    } catch {
      res.redirect("/smart_energy_monitor_esp32.ino");
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Serveur pr\xEAt sur http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
