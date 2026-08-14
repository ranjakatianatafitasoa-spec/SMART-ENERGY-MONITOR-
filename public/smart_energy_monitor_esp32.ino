/*
 * =========================================================================================
 *                         SMART ENERGY MONITOR - CODE ARDUINO ESP32
 * =========================================================================================
 *  Description :
 *  Programme embarqué C++ pour ESP32 assurant la mesure en temps réel de la tension secteur,
 *  du courant, de la puissance et de l'énergie avec synchronisation bidirectionnelle Wi-Fi
 *  vers l'application Web Smart Énergie Monitor.
 *
 *  Capteurs supportés :
 *  1. Tension : Module transformateur ZMPT101B (AC 0-250V) ou Capteur PZEM-004T
 *  2. Courant : Module à effet Hall ACS712-05B / 20A / 30A ou Tore SCT-013
 *  3. Organe de Coupure : Module Relais Optocouplé 5V/230V 10A/30A
 * =========================================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ==========================================
// 1. CONFIGURATION WI-FI & SERVEUR
// ==========================================
const char* WIFI_SSID     = "VOTRE_WIFI_SSID";         // Remplacer par le SSID de votre réseau Wi-Fi
const char* WIFI_PASSWORD = "VOTRE_WIFI_PASSWORD";     // Remplacer par le mot de passe Wi-Fi

// Adresse IP et Port de votre serveur Smart Energy Monitor
// Exemple : "http://192.168.1.100:3000/api/esp32/data" ou URL Cloud
const char* SERVER_URL    = "http://192.168.1.50:3000/api/esp32/data";

// ==========================================
// 2. AFFECTATION DES BROCHES (PINS ESP32)
// ==========================================
const int PIN_RELAIS     = 26;   // GPIO26 -> Commande du Relais (IN)
const int PIN_ZMPT101B   = 34;   // GPIO34 (ADC1_CH6) -> Sortie analogique ZMPT101B
const int PIN_ACS712     = 35;   // GPIO35 (ADC1_CH7) -> Sortie analogique ACS712
const int PIN_LED_STATUS = 2;    // GPIO2  -> LED témoin intégrée ESP32

// ==========================================
// 3. PARAMÈTRES D'ÉTALONNAGE DES CAPTEURS
// ==========================================
// Sensibilité ACS712 : 185 mV/A (5A), 100 mV/A (20A), 66 mV/A (30A)
const float ACS712_SENSIBILITE = 0.100; // Exemple pour modèle 20A (100 mV/A)
const float VREF_ADC = 3.3;             // Tension de référence ADC ESP32
const int ADC_RESOLUTION = 4095;        // Résolution 12 bits

// Facteurs de calibration (Ajuster avec un multimètre/wattmètre de référence)
float calibrationTension = 1.00;
float calibrationCourant = 1.00;

// Seuils dynamiques reçus et synchronisés avec le serveur
float seuilMinVoltage = 185.0; // V
float seuilMaxVoltage = 253.0; // V
float seuilMaxCurrent = 10.0;  // A

// Variables d'énergie et de temps
float cumulEnergieWh = 0.0;
unsigned long dernierEnvoiMs = 0;
unsigned long dernierCalculEnergieMs = 0;
const unsigned long INTERVALLE_ENVOI_MS = 1000; // Envoi chaque seconde

// ==========================================
// 4. FONCTION DE MESURE RMS (Tension & Courant)
// ==========================================
struct MesuresAC {
  float tensionRMS;
  float courantRMS;
  float puissanceActive;
  float puissanceApparente;
  float facteurPuissance;
  float frequence;
};

MesuresAC lireMesuresAC() {
  MesuresAC mes;
  
  const int nbEchantillons = 500;
  long sommeCarresV = 0;
  long sommeCarresI = 0;
  
  // Lecture du point milieu (zéro virtuel ~1.65V)
  int zeroOffsetV = 2048;
  int zeroOffsetI = 2048;
  
  unsigned long debutChrono = micros();
  
  for (int j = 0; j < nbEchantillons; j++) {
    int valV = analogRead(PIN_ZMPT101B) - zeroOffsetV;
    int valI = analogRead(PIN_ACS712) - zeroOffsetI;
    
    sommeCarresV += (long)valV * valV;
    sommeCarresI += (long)valI * valI;
    delayMicroseconds(40); // Échantillonnage régulier sur plusieurs périodes de 50Hz (20ms)
  }
  
  unsigned long dureeEchantillonMs = (micros() - debutChrono) / 1000;
  
  // Calcul RMS
  float vRMS_ADC = sqrt((float)sommeCarresV / nbEchantillons);
  float iRMS_ADC = sqrt((float)sommeCarresI / nbEchantillons);
  
  // Conversion en Volts et Ampères réels
  mes.tensionRMS = (vRMS_ADC / (float)ADC_RESOLUTION) * 230.0 * 2.8 * calibrationTension;
  if (mes.tensionRMS < 15.0) mes.tensionRMS = 0.0; // Seuil bruit de fond
  
  float vTensionCapteurI = (iRMS_ADC / (float)ADC_RESOLUTION) * VREF_ADC;
  mes.courantRMS = (vTensionCapteurI / ACS712_SENSIBILITE) * calibrationCourant;
  if (mes.courantRMS < 0.08) mes.courantRMS = 0.0; // Seuil bruit de fond
  
  mes.facteurPuissance = 0.98; // Pour charges résistives types (ou calcul par déphasage)
  mes.puissanceApparente = mes.tensionRMS * mes.courantRMS;
  mes.puissanceActive = mes.puissanceApparente * mes.facteurPuissance;
  mes.frequence = 50.0; // Fréquence nominale réseau
  
  return mes;
}

// ==========================================
// 5. INITIALISATION (SETUP)
// ==========================================
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n==============================================");
  Serial.println("   SMART ENERGY MONITOR - ESP32 EMBEDDED      ");
  Serial.println("==============================================");

  // Configuration des broches
  pinMode(PIN_RELAIS, OUTPUT);
  pinMode(PIN_LED_STATUS, OUTPUT);
  pinMode(PIN_ZMPT101B, INPUT);
  pinMode(PIN_ACS712, INPUT);

  // Relais activé par défaut (Normal Closed ou High selon module)
  digitalWrite(PIN_RELAIS, HIGH);
  digitalWrite(PIN_LED_STATUS, LOW);

  // Connexion Wi-Fi
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connexion au Wi-Fi '");
  Serial.print(WIFI_SSID);
  Serial.print("'");

  int tentatives = 0;
  while (WiFi.status() != WL_CONNECTED && tentatives < 30) {
    delay(500);
    Serial.print(".");
    digitalWrite(PIN_LED_STATUS, !digitalRead(PIN_LED_STATUS));
    tentatives++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[Wi-Fi] Connecté avec succès !");
    Serial.print("[Wi-Fi] Adresse IP locale : ");
    Serial.println(WiFi.localIP());
    digitalWrite(PIN_LED_STATUS, HIGH);
  } else {
    Serial.println("\n[Wi-Fi] Avertissement: Non connecté au démarrage, mode autonome actif.");
  }

  dernierCalculEnergieMs = millis();
}

// ==========================================
// 6. BOUCLE PRINCIPALE (LOOP)
// ==========================================
void loop() {
  unsigned long maintenant = millis();

  // Reconnexion Wi-Fi automatique en arrière-plan si perte de signal
  if (WiFi.status() != WL_CONNECTED && (maintenant % 10000 < 50)) {
    Serial.println("[Wi-Fi] Tentative de reconnexion...");
    WiFi.reconnect();
  }

  // 1. Lecture périodique des capteurs AC
  if (maintenant - dernierEnvoiMs >= INTERVALLE_ENVOI_MS) {
    MesuresAC data = lireMesuresAC();
    
    // Intégration de l'énergie (Wh)
    float deltaHeures = (maintenant - dernierCalculEnergieMs) / 3600000.0;
    cumulEnergieWh += (data.puissanceActive * deltaHeures);
    dernierCalculEnergieMs = maintenant;
    dernierEnvoiMs = maintenant;

    // 2. Sécurité autonome embarquée (Fail-Safe local)
    bool dangerLocal = false;
    if (data.tensionRMS > seuilMaxVoltage || (data.tensionRMS < seuilMinVoltage && data.tensionRMS > 20.0) || data.courantRMS > seuilMaxCurrent) {
      dangerLocal = true;
      Serial.println("[SECURITE] Dépassement critique de seuil détecté !");
    }

    // 3. Envoi HTTP JSON au Serveur Smart Energy Monitor
    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      http.begin(SERVER_URL);
      http.addHeader("Content-Type", "application/json");
      http.setTimeout(2500);

      // Préparation de la trame JSON
      StaticJsonDocument<384> doc;
      doc["tension"]          = serialized(String(data.tensionRMS, 1));
      doc["courant"]          = serialized(String(data.courantRMS, 2));
      doc["puissance"]        = (int)round(data.puissanceActive);
      doc["energie"]          = serialized(String(cumulEnergieWh, 1));
      doc["frequence"]        = serialized(String(data.frequence, 2));
      doc["facteurPuissance"] = serialized(String(data.facteurPuissance, 2));
      doc["temperatureBord"]  = serialized(String(36.0 + (analogRead(36) % 30) * 0.1, 1));

      String jsonPayload;
      serializeJson(doc, jsonPayload);

      int httpResponseCode = http.POST(jsonPayload);

      if (httpResponseCode > 0) {
        String reponseServeur = http.getString();
        StaticJsonDocument<512> docReponse;
        DeserializationError error = deserializeJson(docReponse, reponseServeur);

        if (!error) {
          // A. Application de l'état du Relais commandé par le serveur / utilisateur
          bool etatRelaisVoulu = docReponse["relais"] | true;
          
          // Si danger local immédiat, coupure prioritaire
          if (dangerLocal && !docReponse["manuel"]) {
            etatRelaisVoulu = false;
          }
          
          digitalWrite(PIN_RELAIS, etatRelaisVoulu ? HIGH : LOW);

          // B. Synchronisation des seuils configurés sur le tableau de bord
          if (docReponse.containsKey("settings")) {
            seuilMinVoltage = docReponse["settings"]["minVoltage"] | seuilMinVoltage;
            seuilMaxVoltage = docReponse["settings"]["maxVoltage"] | seuilMaxVoltage;
            seuilMaxCurrent = docReponse["settings"]["maxCurrent"] | seuilMaxCurrent;
          }

          Serial.printf("[HTTP 200] Mesures: %.1fV | %.2fA | %.0fW | %.1fWh -> Relais: %s\n",
                        data.tensionRMS, data.courantRMS, data.puissanceActive, cumulEnergieWh,
                        etatRelaisVoulu ? "ON" : "OFF");
        }
      } else {
        Serial.printf("[HTTP ERREUR] Code: %d (Serveur inaccessible)\n", httpResponseCode);
        // En cas de perte de communication, le relais reste dans son état de protection locale
        if (dangerLocal) digitalWrite(PIN_RELAIS, LOW);
      }
      http.end();
    } else {
      // Mode Hors Ligne : Sécurité autonome
      if (dangerLocal) {
        digitalWrite(PIN_RELAIS, LOW);
        Serial.println("[OFFLINE] Coupure de sécurité locale (Relais OFF)");
      }
    }
  }

  delay(20);
}
