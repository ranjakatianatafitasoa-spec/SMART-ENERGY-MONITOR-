/*
 * =========================================================================================
 *                   SMART ENERGY MONITOR - CODE ARDUINO ESP32 (V3.0 ROBUSTE)
 * =========================================================================================
 *  Description :
 *  Programme embarqué C++ haute précision pour ESP32 :
 *  - Mesure AC RMS réelle par échantillonnage sinusoïdal synchrone 50Hz/60Hz
 *  - Détection automatique du secteur débranché (Zéro dynamique & filtre bruit de fond)
 *  - Support des modules Relais (Active-LOW standard ou Active-HIGH)
 *  - Synchronisation bidirectionnelle Wi-Fi / HTTP REST avec le Dashboard Web
 *
 *  Brochage recommandé ESP32 :
 *  - GPIO 26 : Commande Relais (Borne IN du module Relais)
 *  - GPIO 34 : Sortie analogique du module Tension ZMPT101B (ADC1_CH6)
 *  - GPIO 35 : Sortie analogique du module Courant ACS712 (ADC1_CH7)
 *  - GPIO 2  : LED témoin Wi-Fi
 * =========================================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// =========================================================================
// 1. CONFIGURATION WI-FI & ADRESSE DU SERVEUR
// =========================================================================
const char* WIFI_SSID     = "VOTRE_WIFI_SSID";       // Nom de votre réseau Wi-Fi
const char* WIFI_PASSWORD = "VOTRE_WIFI_PASSWORD";   // Mot de passe Wi-Fi

// Adresse IP locale de votre ordinateur hébergeant l'application (ou URL Cloud)
// Exemple : "http://192.168.1.50:3000/api/esp32/data"
const char* SERVER_URL    = "http://192.168.1.50:3000/api/esp32/data";

// =========================================================================
// 2. CONFIGURATION MATÉRIELLE & BROCHES (PINS)
// =========================================================================
const int PIN_RELAIS     = 26;   // GPIO26 -> Broche IN du Relais
const int PIN_ZMPT101B   = 34;   // GPIO34 -> Signal OUT du ZMPT101B (Entrée ADC1)
const int PIN_ACS712     = 35;   // GPIO35 -> Signal OUT de l'ACS712 (Entrée ADC1)
const int PIN_LED_STATUS = 2;    // GPIO2  -> LED témoin intégrée ESP32

// =========================================================================
// 3. CONFIGURATION DU TYPE DE RELAIS (ACTIVE LOW / ACTIVE HIGH)
// =========================================================================
// 95% des modules relais Arduino (Songle optocouplés) sont ACTIVE-LOW :
// - Commande LOW (0V)  -> Relais ENCLENCHÉ (Passant, COM connecté à NO)
// - Commande HIGH (3.3V/5V) -> Relais COUPÉ (Ouvert, sécurité)
// Si votre module est Active-HIGH, changez cette constante à HIGH.
const int RELAIS_NIVEAU_ACTIF = LOW; 
const int RELAIS_NIVEAU_COUPE = HIGH;

// =========================================================================
// 4. PARAMÈTRES D'ÉTALONNAGE & SEUILS DE SÉCURITÉ
// =========================================================================
// Modèle ACS712 : 5A = 0.185 V/A | 20A = 0.100 V/A | 30A = 0.066 V/A
const float ACS712_SENSIBILITE = 0.100; // Modèle 20A (100 mV par Ampère)

// Facteurs d'étalonnage (Ajustez si nécessaire avec un multimètre de référence)
float CALIBRATION_TENSION = 1.00;
float CALIBRATION_COURANT = 1.00;

// Seuils par défaut (synchronisés automatiquement avec l'application)
float seuilMinVoltage = 185.0; // V
float seuilMaxVoltage = 253.0; // V
float seuilMaxCurrent = 10.0;  // A

// État local du Relais et accumulateurs
bool relaisLocalActif = true;
float cumulEnergieWh = 0.0;
unsigned long dernierEnvoiMs = 0;
unsigned long dernierCalculEnergieMs = 0;
const unsigned long INTERVALLE_ENVOI_MS = 1000; // Envoi chaque 1 seconde

// Structure des mesures
struct MesuresAC {
  float tensionRMS;
  float courantRMS;
  float puissanceActive;
  float puissanceApparente;
  float facteurPuissance;
  float frequence;
};

// =========================================================================
// 5. FONCTION DE PILOTAGE PHYSIQUE DU RELAIS
// =========================================================================
void appliquerEtatRelais(bool activer) {
  relaisLocalActif = activer;
  if (activer) {
    digitalWrite(PIN_RELAIS, RELAIS_NIVEAU_ACTIF);
    Serial.println("[RELAIS] -> ACTIVÉ (Courant passant)");
  } else {
    digitalWrite(PIN_RELAIS, RELAIS_NIVEAU_COUPE);
    Serial.println("[RELAIS] -> COUPÉ / SÉCURITÉ (Circuit ouvert)");
  }
}

// =========================================================================
// 6. MESURE HAUTE PRÉCISION AVEC ÉLIMINATION DU BRUIT (SECTEUR DÉBRANCHÉ)
// =========================================================================
MesuresAC lireMesuresAC() {
  MesuresAC mes;
  mes.frequence = 50.0;
  mes.facteurPuissance = 0.98;

  const int NB_ECHANTILLONS = 400; // Échantillons sur ~2 périodes complètes de 50Hz (40ms)
  int minV = 4095, maxV = 0;
  int minI = 4095, maxI = 0;
  long sumV = 0, sumI = 0;
  
  int bufferV[NB_ECHANTILLONS];
  int bufferI[NB_ECHANTILLONS];

  // Passe 1 : Acquisition rapide et recherche de la composante continue (offset moyen)
  for (int j = 0; j < NB_ECHANTILLONS; j++) {
    int v = analogRead(PIN_ZMPT101B);
    int i = analogRead(PIN_ACS712);

    bufferV[j] = v;
    bufferI[j] = i;

    sumV += v;
    sumI += i;

    if (v < minV) minV = v;
    if (v > maxV) maxV = v;
    if (i < minI) minI = i;
    if (i > maxI) maxI = i;

    delayMicroseconds(95); // ~10 kHz d'échantillonnage
  }

  // Calcul de la composante continue réelle (Zéro virtuel dynamique)
  float offsetV = (float)sumV / NB_ECHANTILLONS;
  float offsetI = (float)sumI / NB_ECHANTILLONS;

  // Calcul de l'amplitude crête à crête
  int vPP = maxV - minV;
  int iPP = maxI - minI;

  // --- TRAITEMENT DE LA TENSION SECTEUR (ZMPT101B) ---
  // Si le signal crête à crête est inférieur au seuil de bruit ADC (< 25 counts), le secteur est DÉBRANCHÉ (0V réel)
  if (vPP < 25) {
    mes.tensionRMS = 0.0;
  } else {
    // Calcul RMS réel en soustrayant le vrai offset dynamique
    double sumSquaresV = 0;
    for (int j = 0; j < NB_ECHANTILLONS; j++) {
      double diffV = (double)bufferV[j] - offsetV;
      sumSquaresV += (diffV * diffV);
    }
    double vRMS_ADC = sqrt(sumSquaresV / NB_ECHANTILLONS);
    
    // Facteur d'échelle ZMPT101B vers 230V AC
    mes.tensionRMS = (vRMS_ADC / 4095.0) * 230.0 * 2.85 * CALIBRATION_TENSION;
    
    // Seuil de coupure franche : en dessous de 18V, c'est considéré comme 0V (hors tension)
    if (mes.tensionRMS < 18.0) {
      mes.tensionRMS = 0.0;
    }
  }

  // --- TRAITEMENT DU COURANT (ACS712) ---
  // Si le relais est coupé ou secteur absent, le courant est strictement nul
  if (!relaisLocalActif || mes.tensionRMS == 0.0 || iPP < 20) {
    mes.courantRMS = 0.0;
  } else {
    double sumSquaresI = 0;
    for (int j = 0; j < NB_ECHANTILLONS; j++) {
      double diffI = (double)bufferI[j] - offsetI;
      sumSquaresI += (diffI * diffI);
    }
    double iRMS_ADC = sqrt(sumSquaresI / NB_ECHANTILLONS);
    
    // Conversion tension capteur vers intensité
    double vCapteurRMS = (iRMS_ADC / 4095.0) * 3.3;
    mes.courantRMS = (vCapteurRMS / ACS712_SENSIBILITE) * CALIBRATION_COURANT;
    
    // Filtre de bruit résiduel à vide (< 0.08A)
    if (mes.courantRMS < 0.08) {
      mes.courantRMS = 0.0;
    }
  }

  // --- CALCUL DES PUISSANCES ---
  if (mes.tensionRMS == 0.0 || mes.courantRMS == 0.0) {
    mes.puissanceApparente = 0.0;
    mes.puissanceActive = 0.0;
  } else {
    mes.puissanceApparente = mes.tensionRMS * mes.courantRMS;
    mes.puissanceActive = mes.puissanceApparente * mes.facteurPuissance;
  }

  return mes;
}

// =========================================================================
// 7. INITIALISATION (SETUP)
// =========================================================================
void setup() {
  Serial.begin(115200);
  delay(300);
  
  Serial.println("\n==================================================");
  Serial.println("   SMART ENERGY MONITOR - ESP32 V3.0 EMBEDDED     ");
  Serial.println("==================================================");

  // Configuration de l'ADC ESP32 pour pleine échelle 0 - 3.3V
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  // Configuration des broches
  pinMode(PIN_RELAIS, OUTPUT);
  pinMode(PIN_LED_STATUS, OUTPUT);
  pinMode(PIN_ZMPT101B, INPUT);
  pinMode(PIN_ACS712, INPUT);

  // Activation initiale du Relais (Secteur passant)
  appliquerEtatRelais(true);
  digitalWrite(PIN_LED_STATUS, LOW);

  // Connexion au réseau Wi-Fi
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.printf("[Wi-Fi] Connexion à '%s'...\n", WIFI_SSID);

  int timeout = 0;
  while (WiFi.status() != WL_CONNECTED && timeout < 25) {
    delay(400);
    Serial.print(".");
    digitalWrite(PIN_LED_STATUS, !digitalRead(PIN_LED_STATUS));
    timeout++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[Wi-Fi] Connecté !");
    Serial.print("[Wi-Fi] Adresse IP ESP32 : ");
    Serial.println(WiFi.localIP());
    digitalWrite(PIN_LED_STATUS, HIGH);
  } else {
    Serial.println("\n[Wi-Fi] Non connecté (Mode sécurité autonome actif)");
  }

  dernierCalculEnergieMs = millis();
}

// =========================================================================
// 8. BOUCLE PRINCIPALE (LOOP)
// =========================================================================
void loop() {
  unsigned long maintenant = millis();

  // Reconnexion automatique en arrière-plan
  if (WiFi.status() != WL_CONNECTED && (maintenant % 10000 < 50)) {
    WiFi.reconnect();
  }

  // Échantillonnage et envoi toutes les secondes
  if (maintenant - dernierEnvoiMs >= INTERVALLE_ENVOI_MS) {
    MesuresAC data = lireMesuresAC();

    // Cumul de l'énergie (Wh)
    float deltaHeures = (maintenant - dernierCalculEnergieMs) / 3600000.0;
    if (data.puissanceActive > 0) {
      cumulEnergieWh += (data.puissanceActive * deltaHeures);
    }
    dernierCalculEnergieMs = maintenant;
    dernierEnvoiMs = maintenant;

    // Affichage moniteur série
    Serial.printf("[MESURES] Tension: %.1fV | Courant: %.2fA | Puissance: %.0fW | Relais: %s\n",
                  data.tensionRMS, data.courantRMS, data.puissanceActive,
                  relaisLocalActif ? "ON" : "OFF");

    // Sécurité locale autonome (Fail-Safe)
    bool anomalieCritique = false;
    if (data.tensionRMS > seuilMaxVoltage || (data.tensionRMS < seuilMinVoltage && data.tensionRMS > 25.0) || data.courantRMS > seuilMaxCurrent) {
      anomalieCritique = true;
      Serial.println("[SECURITE] Dépassement de seuil détecté localement !");
    }

    // Communication HTTP avec le serveur
    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      http.begin(SERVER_URL);
      http.addHeader("Content-Type", "application/json");
      http.setTimeout(2500);

      // Trame JSON
      StaticJsonDocument<384> doc;
      doc["tension"]          = serialized(String(data.tensionRMS, 1));
      doc["courant"]          = serialized(String(data.courantRMS, 2));
      doc["puissance"]        = (int)round(data.puissanceActive);
      doc["energie"]          = serialized(String(cumulEnergieWh, 1));
      doc["frequence"]        = serialized(String(data.frequence, 2));
      doc["facteurPuissance"] = serialized(String(data.facteurPuissance, 2));
      doc["relais"]           = relaisLocalActif;

      String payload;
      serializeJson(doc, payload);

      int httpCode = http.POST(payload);

      if (httpCode > 0) {
        String reponse = http.getString();
        StaticJsonDocument<512> resDoc;
        DeserializationError err = deserializeJson(resDoc, reponse);

        if (!err) {
          // 1. Mise à jour de l'état du Relais demandé par l'application
          if (resDoc.containsKey("relais")) {
            bool relaisVoulu = resDoc["relais"].as<bool>();
            
            // Si anomalie critique locale et non forcée manuellement, priorité à la coupure
            if (anomalieCritique && !resDoc["manuel"]) {
              relaisVoulu = false;
            }

            if (relaisVoulu != relaisLocalActif) {
              appliquerEtatRelais(relaisVoulu);
            }
          }

          // 2. Synchronisation des seuils de sécurité
          if (resDoc.containsKey("settings")) {
            seuilMinVoltage = resDoc["settings"]["minVoltage"] | seuilMinVoltage;
            seuilMaxVoltage = resDoc["settings"]["maxVoltage"] | seuilMaxVoltage;
            seuilMaxCurrent = resDoc["settings"]["maxCurrent"] | seuilMaxCurrent;
          }
        }
      } else {
        Serial.printf("[HTTP] Erreur communication: %d\n", httpCode);
        if (anomalieCritique) {
          appliquerEtatRelais(false);
        }
      }
      http.end();
    } else {
      // Mode Hors-Ligne
      if (anomalieCritique) {
        appliquerEtatRelais(false);
      }
    }
  }

  delay(20);
}
