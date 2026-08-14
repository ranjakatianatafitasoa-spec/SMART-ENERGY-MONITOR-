export type NiveauStatus = 'NORMAL' | 'ATTENTION' | 'DANGER';

export interface ESP32Data {
  tension: number;           // e.g. 230.5 V
  courant: number;           // e.g. 1.42 A
  puissance: number;         // e.g. 327 W
  energie: number;           // e.g. 1420.5 Wh
  niveau: NiveauStatus;
  message: string;
  relais: boolean;           // true = ON, false = OFF
  manuel: boolean;           // true = Manual mode, false = Auto mode
  rearmement?: number;       // seconds remaining for auto rearm, or -1
  // Additional smart grid metrics
  frequence?: number;        // e.g. 50.0 Hz
  facteurPuissance?: number; // e.g. 0.98
  puissanceApparente?: number; // e.g. 327 VA
  temperatureBord?: number;  // e.g. 36.2 °C
  wifiConnected?: boolean;   // true = WiFi connected, false = Disconnected
  esp32Connected?: boolean;  // true if real ESP32 is sending HTTP requests
  connectionMode?: 'ap' | 'server' | 'custom';
  esp32Ip?: string;
  settings?: {
    minVoltage: number;
    maxVoltage: number;
    minCurrent: number;
    maxCurrent: number;
    soundAlerts: boolean;
    esp32Ip?: string;
    connectionMode?: 'ap' | 'server' | 'custom';
  };
}

export interface HistoryRecord extends ESP32Data {
  t: string;                 // ISO timestamp
  incident: boolean;         // true if state change / alert
}

export type ScaleType = 'V' | 'I' | 'P';

export interface ScaleOption {
  v: number;
  l: string;
}

export type ActiveTab = 'dashboard' | 'relais' | 'history' | 'reports' | 'settings' | 'about';
