/*
 * =========================================================================================
 *             SMART ENERGY MONITOR - ESP32 POINT D'ACCÈS WI-FI DIRECT (V4.0 AP/STA)
 * =========================================================================================
 *  Description :
 *  Programme embarqué C++ haute fiabilité pour ESP32 :
 *  - Mode Point d'Accès Wi-Fi Direct (SoftAP) : Crée son propre réseau Wi-Fi autonome
 *    SSID : "SMART_ENERGY_MONITOR" | Mot de passe : "12345678" | IP : 192.168.4.1
 *  - Serveur Web REST API embarqué (Port 80) avec en-têtes CORS complets
 *  - Contrôle physique immédiat du Relais (Active-LOW optocouplé standard)
 *  - Mesure AC RMS haute précision avec zéro dynamique & détection secteur débranché (0V)
 *  - Synchronisation bidirectionnelle : Télémétrie capteurs, Seuils réglables & Commande Relais
 *
 *  Brochage recommandé ESP32 :
 *  - GPIO 26 : Commande Relais (Borne IN du module Relais)
 *  - GPIO 34 : Sortie analogique ZMPT101B (ADC1_CH6)
 *  - GPIO 35 : Sortie analogique ACS712 (ADC1_CH7)
 *  - GPIO 2  : LED témoin d'activité
 * =========================================================================================
 */

#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>

// =========================================================================
// 1. CONFIGURATION DU POINT D'ACCÈS WI-FI DIRECT (ESP32 SOFT-AP)
// =========================================================================
const char* AP_SSID     = "SMART_ENERGY_MONITOR"; // Nom du réseau Wi-Fi émis par l'ESP32
const char* AP_PASSWORD = "12345678";             // Mot de passe (8 caractères minimum)
const IPAddress AP_IP(192, 168, 4, 1);            // IP fixe du Point d'Accès
const IPAddress AP_GATEWAY(192, 168, 4, 1);
const IPAddress AP_SUBNET(255, 255, 255, 0);

// (Optionnel) Réseau Wi-Fi local de votre Box Internet si vous souhaitez le mode Hybride
const char* STA_SSID     = "VOTRE_WIFI_BOX";      // Laissez vide si utilisation exclusive en AP
const char* STA_PASSWORD = "VOTRE_WIFI_PASSWORD";

// =========================================================================
// 2. CONFIGURATION MATÉRIELLE & PINS
// =========================================================================
const int PIN_RELAIS     = 26;   // GPIO26 -> IN du Relais
const int PIN_ZMPT101B   = 34;   // GPIO34 -> Signal Tension ZMPT101B
const int PIN_ACS712     = 35;   // GPIO35 -> Signal Courant ACS712
const int PIN_LED_STATUS = 2;    // GPIO2  -> LED témoin

// Logique du Relais (95% des modules Arduino/ESP32 sont ACTIVE-LOW)
const int RELAIS_NIVEAU_ACTIF = LOW;  // Relais enclenché (Courant passant)
const int RELAIS_NIVEAU_COUPE = HIGH; // Relais coupé (Circuit ouvert de sécurité)

// =========================================================================
// 3. PARAMÈTRES DE MESURE & VARIABLES GLOBALES
// =========================================================================
const float ACS712_SENSIBILITE = 0.100; // Modèle 20A (100 mV/A) | 5A = 0.185 | 30A = 0.066
float CALIBRATION_TENSION = 1.00;
float CALIBRATION_COURANT = 1.00;

// Seuils de sécurité configurables
float seuilMinVoltage = 185.0; // V
float seuilMaxVoltage = 253.0; // V
float seuilMaxCurrent = 10.0;  // A
bool alertesSonores = true;

// Variables d'état
bool relaisActif = true;
bool modeManuel = false;
float tensionActuelle = 0.0;
float courantActuel = 0.0;
float puissanceActive = 0.0;
float puissanceApparente = 0.0;
float energieCumulWh = 0.0;
float frequenceActuelle = 50.0;
float facteurPuissance = 0.98;
String etatNiveau = "NORMAL";
String messageSysteme = "Système nominal (ESP32 AP)";

unsigned long dernierCalculMs = 0;
unsigned long dernierEchantillonnageMs = 0;

// Instanciation du Serveur Web sur le port 80
WebServer server(80);

// =========================================================================
// 4. PILOTAGE PHYSIQUE DU RELAIS
// =========================================================================
void appliquerEtatRelais(bool activer) {
  relaisActif = activer;
  digitalWrite(PIN_RELAIS, activer ? RELAIS_NIVEAU_ACTIF : RELAIS_NIVEAU_COUPE);
  Serial.printf("[RELAIS] -> %s (GPIO %d = %s)\n",
                activer ? "ACTIVÉ (PASSANT)" : "COUPÉ (SÉCURITÉ)",
                PIN_RELAIS, activer ? "LOW" : "HIGH");
}

// =========================================================================
// 5. ÉCHANTILLONNAGE AC RMS & FILTRE BRUIT (SECTEUR DÉBRANCHÉ = 0V)
// =========================================================================
void effectuerMesuresAC() {
  const int NB_ECH = 400; // Échantillonnage sur 2 périodes à 50Hz (40ms)
  int minV = 4095, maxV = 0;
  int minI = 4095, maxI = 0;
  long sumV = 0, sumI = 0;
  int bufV[NB_ECH];
  int bufI[NB_ECH];

  for (int j = 0; j < NB_ECH; j++) {
    int v = analogRead(PIN_ZMPT101B);
    int i = analogRead(PIN_ACS712);

    bufV[j] = v;
    bufI[j] = i;
    sumV += v;
    sumI += i;

    if (v < minV) minV = v;
    if (v > maxV) maxV = v;
    if (i < minI) minI = i;
    if (i > maxI) maxI = i;

    delayMicroseconds(95); // ~10 kHz
  }

  float offsetV = (float)sumV / NB_ECH;
  float offsetI = (float)sumI / NB_ECH;

  int vPP = maxV - minV;
  int iPP = maxI - minI;

  // 1. TENSION SECTEUR
  if (vPP < 25) {
    tensionActuelle = 0.0;
  } else {
    double sqV = 0;
    for (int j = 0; j < NB_ECH; j++) {
      double diff = (double)bufV[j] - offsetV;
      sqV += (diff * diff);
    }
    double vRMS_ADC = sqrt(sqV / NB_ECH);
    tensionActuelle = (vRMS_ADC / 4095.0) * 230.0 * 2.85 * CALIBRATION_TENSION;
    if (tensionActuelle < 18.0) tensionActuelle = 0.0;
  }

  // 2. COURANT SECTEUR
  if (!relaisActif || tensionActuelle == 0.0 || iPP < 20) {
    courantActuel = 0.0;
  } else {
    double sqI = 0;
    for (int j = 0; j < NB_ECH; j++) {
      double diff = (double)bufI[j] - offsetI;
      sqI += (diff * diff);
    }
    double iRMS_ADC = sqrt(sqI / NB_ECH);
    double vCapteurRMS = (iRMS_ADC / 4095.0) * 3.3;
    courantActuel = (vCapteurRMS / ACS712_SENSIBILITE) * CALIBRATION_COURANT;
    if (courantActuel < 0.08) courantActuel = 0.0;
  }

  // 3. PUISSANCES & ÉNERGIE
  if (tensionActuelle == 0.0 || courantActuel == 0.0 || !relaisActif) {
    puissanceApparente = 0.0;
    puissanceActive = 0.0;
  } else {
    puissanceApparente = tensionActuelle * courantActuel;
    puissanceActive = puissanceApparente * facteurPuissance;
  }

  unsigned long now = millis();
  float deltaHeures = (now - dernierCalculMs) / 3600000.0;
  if (puissanceActive > 0) {
    energieCumulWh += (puissanceActive * deltaHeures);
  }
  dernierCalculMs = now;

  // 4. ÉVALUATION DES SEUILS ET SÉCURITÉ AUTOMATIQUE
  if (tensionActuelle == 0.0) {
    etatNiveau = "DANGER";
    messageSysteme = "Coupure secteur (0V) détectée";
  } else if (tensionActuelle > seuilMaxVoltage) {
    etatNiveau = "DANGER";
    messageSysteme = "Surtension secteur critique (>" + String((int)seuilMaxVoltage) + "V)";
    if (!modeManuel && relaisActif) {
      appliquerEtatRelais(false);
    }
  } else if (tensionActuelle < seuilMinVoltage) {
    etatNiveau = "ATTENTION";
    messageSysteme = "Sous-tension secteur (<" + String((int)seuilMinVoltage) + "V)";
    if (!modeManuel && relaisActif) {
      appliquerEtatRelais(false);
    }
  } else if (courantActuel > seuilMaxCurrent) {
    etatNiveau = "ATTENTION";
    messageSysteme = "Surcharge courant (>" + String(seuilMaxCurrent, 1) + "A)";
    if (!modeManuel && relaisActif) {
      appliquerEtatRelais(false);
    }
  } else {
    etatNiveau = "NORMAL";
    messageSysteme = "Système nominal (ESP32 AP Connecté)";
    // Réarmement automatique en mode auto si les paramètres redeviennent normaux
    if (!modeManuel && !relaisActif && tensionActuelle >= seuilMinVoltage && tensionActuelle <= seuilMaxVoltage) {
      appliquerEtatRelais(true);
    }
  }
}

// =========================================================================
// 6. GESTION DES REQUÊTES HTTP REST API DU SERVEUR WEB EMBARQUÉ
// =========================================================================
void ajouterHeadersCORS() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
}

void handleOptions() {
  ajouterHeadersCORS();
  server.send(204);
}

// GET /data ou GET /api/data : Envoie les données en temps réel au format JSON pur
void handleGetData() {
  ajouterHeadersCORS();
  
  StaticJsonDocument<512> doc;
  // Envoi de vrais nombres décimaux (valeurs numériques conformes JSON standard)
  doc["tension"]            = round(tensionActuelle * 10.0) / 10.0;
  doc["courant"]            = round(courantActuel * 100.0) / 100.0;
  doc["puissance"]          = (int)round(puissanceActive);
  doc["energie"]            = round(energieCumulWh * 10.0) / 10.0;
  doc["frequence"]          = round(frequenceActuelle * 10.0) / 10.0;
  doc["facteurPuissance"]   = round(facteurPuissance * 100.0) / 100.0;
  doc["puissanceApparente"] = (int)round(puissanceApparente);
  doc["temperatureBord"]    = 34.8;
  doc["relais"]             = relaisActif;
  doc["manuel"]             = modeManuel;
  doc["niveau"]             = etatNiveau;
  doc["message"]            = messageSysteme;
  doc["wifiConnected"]      = true;
  doc["esp32Connected"]     = true;
  doc["connectionMode"]     = "ap";
  doc["apSSID"]             = AP_SSID;
  doc["ip"]                 = WiFi.softAPIP().toString();

  JsonObject s = doc.createNestedObject("settings");
  s["minVoltage"]  = seuilMinVoltage;
  s["maxVoltage"]  = seuilMaxVoltage;
  s["minCurrent"]  = 0;
  s["maxCurrent"]  = seuilMaxCurrent;
  s["soundAlerts"] = alertesSonores;

  String reponse;
  serializeJson(doc, reponse);
  server.send(200, "application/json", reponse);
}

// GET/POST /relais?etat=on|off|auto : Pilotage du Relais
void handleRelais() {
  ajouterHeadersCORS();
  String etat = "";
  
  if (server.hasArg("etat")) {
    etat = server.arg("etat");
  } else if (server.hasArg("plain")) {
    StaticJsonDocument<256> body;
    if (!deserializeJson(body, server.arg("plain"))) {
      if (body.containsKey("etat")) etat = body["etat"].as<String>();
    }
  }
  etat.toLowerCase();

  if (etat == "on") {
    modeManuel = true;
    appliquerEtatRelais(true);
    messageSysteme = "Relais forcé ON (Manuel)";
  } else if (etat == "off") {
    modeManuel = true;
    appliquerEtatRelais(false);
    messageSysteme = "Relais forcé OFF (Manuel)";
  } else if (etat == "auto") {
    modeManuel = false;
    messageSysteme = "Mode Automatique réactivé";
    if (etatNiveau == "NORMAL" && tensionActuelle >= seuilMinVoltage && tensionActuelle <= seuilMaxVoltage) {
      appliquerEtatRelais(true);
    }
  }

  StaticJsonDocument<256> doc;
  doc["status"]  = "ok";
  doc["relais"]  = relaisActif;
  doc["manuel"]  = modeManuel;
  doc["message"] = messageSysteme;

  String reponse;
  serializeJson(doc, reponse);
  server.send(200, "application/json", reponse);
}

// GET /toggle : Inverse l'état du Relais
void handleToggle() {
  ajouterHeadersCORS();
  modeManuel = true;
  appliquerEtatRelais(!relaisActif);
  
  StaticJsonDocument<256> doc;
  doc["status"] = "ok";
  doc["relais"] = relaisActif;
  doc["manuel"] = modeManuel;
  
  String reponse;
  serializeJson(doc, reponse);
  server.send(200, "application/json", reponse);
}

// GET /calibrer : Remise à zéro de l'accumulateur d'énergie
void handleCalibrer() {
  ajouterHeadersCORS();
  energieCumulWh = 0.0;
  server.send(200, "application/json", "{\"status\":\"ok\",\"message\":\"Energie réinitialisée\"}");
}

// POST ou GET /settings : Mise à jour des seuils
void handleSettings() {
  ajouterHeadersCORS();
  bool misAJour = false;

  if (server.hasArg("plain")) {
    StaticJsonDocument<256> doc;
    DeserializationError err = deserializeJson(doc, server.arg("plain"));
    if (!err) {
      if (doc.containsKey("minVoltage")) { seuilMinVoltage = doc["minVoltage"]; misAJour = true; }
      if (doc.containsKey("maxVoltage")) { seuilMaxVoltage = doc["maxVoltage"]; misAJour = true; }
      if (doc.containsKey("maxCurrent")) { seuilMaxCurrent = doc["maxCurrent"]; misAJour = true; }
      if (doc.containsKey("soundAlerts")) { alertesSonores = doc["soundAlerts"]; misAJour = true; }
    }
  }
  
  if (server.hasArg("minVoltage")) { seuilMinVoltage = server.arg("minVoltage").toFloat(); misAJour = true; }
  if (server.hasArg("maxVoltage")) { seuilMaxVoltage = server.arg("maxVoltage").toFloat(); misAJour = true; }
  if (server.hasArg("maxCurrent")) { seuilMaxCurrent = server.arg("maxCurrent").toFloat(); misAJour = true; }

  if (misAJour) {
    Serial.printf("[SETTINGS] Nouveaux seuils: MinV=%.1fV, MaxV=%.1fV, MaxI=%.1fA\n",
                  seuilMinVoltage, seuilMaxVoltage, seuilMaxCurrent);
    // Réévaluation immédiate de la sécurité
    effectuerMesuresAC();
  }
  
  StaticJsonDocument<256> doc;
  doc["status"] = "ok";
  doc["message"] = "Paramètres enregistrés et appliqués";
  doc["minVoltage"] = seuilMinVoltage;
  doc["maxVoltage"] = seuilMaxVoltage;
  doc["maxCurrent"] = seuilMaxCurrent;

  String reponse;
  serializeJson(doc, reponse);
  server.send(200, "application/json", reponse);
}

// GET /ping : Test de liaison
void handlePing() {
  ajouterHeadersCORS();
  server.send(200, "application/json", "{\"status\":\"pong\",\"device\":\"ESP32_SMART_MONITOR\",\"time\":" + String(millis()) + "}");
}

// GET / : Page HTML de test direct
void handleRoot() {
  String html = "<!DOCTYPE html><html lang='fr'><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width,initial-scale=1.0'>";
  html += "<title>Smart Energy Monitor ESP32</title>";
  html += "<style>body{background:#020617;color:#fff;font-family:sans-serif;text-align:center;padding:20px;}";
  html += ".card{background:#0f172a;border:1px solid #06b6d4;border-radius:16px;padding:20px;max-width:400px;margin:20px auto;box-shadow:0 0 20px rgba(6,182,212,0.3);}";
  html += ".btn{display:inline-block;padding:12px 24px;margin:10px 5px;border-radius:12px;font-weight:bold;text-decoration:none;cursor:pointer;}";
  html += ".btn-on{background:#10b981;color:#fff;}.btn-off{background:#ef4444;color:#fff;}";
  html += ".val{font-size:28px;color:#22d3ee;font-weight:bold;margin:10px 0;}</style></head><body>";
  html += "<div class='card'>";
  html += "<h2>SMART ENERGY MONITOR</h2>";
  html += "<p>Mode Point d'Acc&egrave;s Wi-Fi Direct Actif</p>";
  html += "<div class='val'>" + String(tensionActuelle, 1) + " V | " + String(courantActuel, 2) + " A</div>";
  html += "<div class='val'>" + String((int)puissanceActive) + " W | " + String(energieCumulWh, 1) + " Wh</div>";
  html += "<p>Etat Relais : <b>" + String(relaisActif ? "ON (Actif)" : "OFF (Coup&eacute;)") + "</b></p>";
  html += "<a href='/relais?etat=on' class='btn btn-on'>ENCLENCHER RELAIS (ON)</a>";
  html += "<a href='/relais?etat=off' class='btn btn-off'>COUPER RELAIS (OFF)</a>";
  html += "<p style='font-size:12px;color:#94a3b8;margin-top:15px;'>Connectez l'application Web &agrave; http://192.168.4.1</p>";
  html += "</div></body></html>";
  server.send(200, "text/html", html);
}

// =========================================================================
// 7. INITIALISATION (SETUP)
// =========================================================================
void setup() {
  Serial.begin(115200);
  delay(300);

  Serial.println("\n=========================================================");
  Serial.println("  SMART ENERGY MONITOR - POINT D'ACCES WI-FI V4.0        ");
  Serial.println("=========================================================");

  // Configuration ADC 12 bits
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  // Configuration des broches
  pinMode(PIN_RELAIS, OUTPUT);
  pinMode(PIN_LED_STATUS, OUTPUT);
  pinMode(PIN_ZMPT101B, INPUT);
  pinMode(PIN_ACS712, INPUT);

  // Activation initiale du Relais (Secteur passant)
  appliquerEtatRelais(true);
  digitalWrite(PIN_LED_STATUS, HIGH);

  // 1. Démarrage du Point d'Accès Wi-Fi Direct (SoftAP)
  WiFi.mode(WIFI_AP_STA);
  WiFi.softAPConfig(AP_IP, AP_GATEWAY, AP_SUBNET);
  bool apSuccess = WiFi.softAP(AP_SSID, AP_PASSWORD);

  if (apSuccess) {
    Serial.printf("[Wi-Fi AP] Point d'accès démarré avec succès !\n");
    Serial.printf("[Wi-Fi AP] SSID         : %s\n", AP_SSID);
    Serial.printf("[Wi-Fi AP] Mot de passe : %s\n", AP_PASSWORD);
    Serial.print(  "[Wi-Fi AP] Adresse IP   : ");
    Serial.println(WiFi.softAPIP());
  } else {
    Serial.println("[Wi-Fi AP] Échec du démarrage du point d'accès !");
  }

  // 2. (Optionnel) Connexion Wi-Fi Station
  if (strlen(STA_SSID) > 0 && strcmp(STA_SSID, "VOTRE_WIFI_BOX") != 0) {
    Serial.printf("[Wi-Fi STA] Tentative de connexion à %s...\n", STA_SSID);
    WiFi.begin(STA_SSID, STA_PASSWORD);
  }

  // 3. Déclaration des routes du Serveur Web REST API
  server.on("/", HTTP_GET, handleRoot);
  server.on("/data", HTTP_GET, handleGetData);
  server.on("/api/data", HTTP_GET, handleGetData);
  server.on("/relais", HTTP_GET, handleRelais);
  server.on("/relais", HTTP_POST, handleRelais);
  server.on("/toggle", HTTP_GET, handleToggle);
  server.on("/calibrer", HTTP_GET, handleCalibrer);
  server.on("/settings", HTTP_POST, handleSettings);
  server.on("/settings", HTTP_GET, handleSettings);
  server.on("/ping", HTTP_GET, handlePing);

  // Handlers OPTIONS pour pré-vols CORS des navigateurs
  server.on("/data", HTTP_OPTIONS, handleOptions);
  server.on("/api/data", HTTP_OPTIONS, handleOptions);
  server.on("/relais", HTTP_OPTIONS, handleOptions);
  server.on("/settings", HTTP_OPTIONS, handleOptions);
  server.on("/ping", HTTP_OPTIONS, handleOptions);
  server.on("/calibrer", HTTP_OPTIONS, handleOptions);

  server.begin();
  Serial.println("[HTTP] Serveur Web REST API démarré sur le port 80 !");
  dernierCalculMs = millis();
}

// =========================================================================
// 8. BOUCLE PRINCIPALE (LOOP)
// =========================================================================
void loop() {
  // Traitement immédiat des requêtes HTTP reçues des smartphones ou navigateurs
  server.handleClient();

  unsigned long now = millis();

  // Échantillonnage toutes les 500ms
  if (now - dernierEchantillonnageMs >= 500) {
    dernierEchantillonnageMs = now;
    effectuerMesuresAC();

    // Clignotement discret de la LED témoin
    digitalWrite(PIN_LED_STATUS, !digitalRead(PIN_LED_STATUS));
  }

  delay(2);
}

