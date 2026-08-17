import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Network, ConnectionStatus } from '@capacitor/network';
import { App } from '@capacitor/app';

export type AlertLevel = 'CRITICAL' | 'WARNING' | 'NORMAL' | 'INFO';

export type AlertTypeKey =
  | 'surtension'
  | 'soustension'
  | 'coupure'
  | 'surintensite'
  | 'surpuissance'
  | 'deconnexion'
  | 'connexion'
  | 'relais_off'
  | 'relais_on'
  | 'normal';

export interface AlertNotificationPayload {
  level: AlertLevel;
  typeKey: AlertTypeKey;
  title: string;
  message: string;
  detail?: string;
  metrics?: {
    voltage?: number;
    current?: number;
    power?: number;
    energy?: number;
    frequency?: number;
    threshold?: string | number;
  };
  timestamp?: number;
}

export interface NativePermissionsStatus {
  notificationsGranted: boolean;
  isNative: boolean;
  networkStatus: ConnectionStatus | null;
}

class NativeService {
  private isNative: boolean = Capacitor.isNativePlatform();
  private notificationsPermissionGranted: boolean = false;
  private channelsCreated: boolean = false;
  private lastAlertTimestamp: Record<string, number> = {};

  constructor() {
    this.isNative = Capacitor.isNativePlatform();
  }

  /**
   * Initializes native permissions and channels on application startup
   */
  public async initNativeFeatures(): Promise<NativePermissionsStatus> {
    const status: NativePermissionsStatus = {
      notificationsGranted: false,
      isNative: this.isNative,
      networkStatus: null,
    };

    try {
      const netStatus = await Network.getStatus();
      status.networkStatus = netStatus;
    } catch {}

    if (this.isNative) {
      try {
        await this.createNotificationChannels();

        // Register rich action types for Android notification drawer
        try {
          await LocalNotifications.registerActionTypes({
            types: [
              {
                id: 'SMART_ENERGY_NOTIF_ACTIONS',
                actions: [
                  {
                    id: 'open_monitor',
                    title: '⚡ Ouvrir le Moniteur',
                    foreground: true,
                  },
                ],
              },
            ],
          });
        } catch {}

        let check = await LocalNotifications.checkPermissions();
        if (check.display === 'granted') {
          this.notificationsPermissionGranted = true;
          status.notificationsGranted = true;
        } else {
          const req = await LocalNotifications.requestPermissions();
          this.notificationsPermissionGranted = req.display === 'granted';
          status.notificationsGranted = this.notificationsPermissionGranted;
        }
      } catch (err) {
        console.warn('[NativeService] Native permissions check error:', err);
      }
    } else {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          this.notificationsPermissionGranted = true;
          status.notificationsGranted = true;
        } else if (Notification.permission === 'default') {
          try {
            const res = await Notification.requestPermission();
            this.notificationsPermissionGranted = res === 'granted';
            status.notificationsGranted = this.notificationsPermissionGranted;
          } catch {}
        }
      }
    }

    return status;
  }

  /**
   * Explicitly asks for notification permissions from the user
   */
  public async requestNotificationPermission(): Promise<boolean> {
    if (this.isNative) {
      try {
        await this.createNotificationChannels();
        const req = await LocalNotifications.requestPermissions();
        this.notificationsPermissionGranted = req.display === 'granted';
        return this.notificationsPermissionGranted;
      } catch {
        return false;
      }
    } else {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        try {
          const res = await Notification.requestPermission();
          this.notificationsPermissionGranted = res === 'granted';
          return this.notificationsPermissionGranted;
        } catch {
          return false;
        }
      }
      return false;
    }
  }

  /**
   * Creates Android Notification Channels with sound, lights & vibration
   */
  private async createNotificationChannels(): Promise<void> {
    if (!this.isNative || this.channelsCreated) return;
    try {
      // 1. Critical Urgence Channel
      await LocalNotifications.createChannel({
        id: 'smart_energy_critical_channel',
        name: 'Alertes Électriques Critiques',
        description: 'Surtensions dangereuses, coupures secteur 0V et disjonctions',
        importance: 5, // MAX importance - heads up banner
        visibility: 1, // Public lockscreen
        sound: 'beep.wav',
        vibration: true,
        lights: true,
        lightColor: '#EF4444',
      });

      // 2. Warning / Attention Channel
      await LocalNotifications.createChannel({
        id: 'smart_energy_warning_channel',
        name: 'Avertissements Réseau Électrique',
        description: 'Sous-tensions, surcharges de courant et état du relais',
        importance: 4, // HIGH importance
        visibility: 1,
        sound: 'beep.wav',
        vibration: true,
        lights: true,
        lightColor: '#F59E0B',
      });

      // 3. Normal / Information Channel
      await LocalNotifications.createChannel({
        id: 'smart_energy_normal_channel',
        name: 'Statut et Normalisation Réseau',
        description: 'Retour à la normale et état de connexion ESP32',
        importance: 3, // DEFAULT
        visibility: 1,
        vibration: false,
        lights: true,
        lightColor: '#10B981',
      });

      this.channelsCreated = true;
    } catch {
      // Channel creation fallback
    }
  }

  /**
   * Send a rich, standardized alert notification with professional schema
   */
  public async sendAlertNotification(payload: AlertNotificationPayload): Promise<void> {
    const { level, typeKey, title, message, detail, metrics } = payload;

    // Prevent flood: throttle same notification key to once every 4 seconds
    const now = Date.now();
    if (this.lastAlertTimestamp[typeKey] && now - this.lastAlertTimestamp[typeKey] < 4000) {
      return;
    }
    this.lastAlertTimestamp[typeKey] = now;

    // 1. Standardized Visual Title Branding & Palette
    const cleanTitle = title.replace(/^(🔴|⚠️|✅|ℹ️|⚡|\s)+/g, '').trim();

    let titlePrefix = '⚡';
    let iconColor = '#06B6D4';
    let channelId = 'smart_energy_normal_channel';
    let vibrationPattern = [200, 100, 200];
    let summaryText = 'SMART ÉNERGIE MONITOR';

    switch (level) {
      case 'CRITICAL':
        titlePrefix = '⚡ [CRITIQUE]';
        iconColor = '#EF4444';
        channelId = 'smart_energy_critical_channel';
        vibrationPattern = [300, 100, 300, 100, 500];
        summaryText = '⚡ SÉCURITÉ CRITIQUE • COUPURE ACTIVE';
        break;
      case 'WARNING':
        titlePrefix = '⚡ [ATTENTION]';
        iconColor = '#F59E0B';
        channelId = 'smart_energy_warning_channel';
        vibrationPattern = [200, 100, 200, 100, 200];
        summaryText = '⚡ AVERTISSEMENT RÉSEAU';
        break;
      case 'NORMAL':
        titlePrefix = '⚡ [NORMALISÉ]';
        iconColor = '#10B981';
        channelId = 'smart_energy_normal_channel';
        vibrationPattern = [150, 100];
        summaryText = '⚡ RÉSEAU ÉLECTRIQUE CONFORME';
        break;
      case 'INFO':
      default:
        titlePrefix = '⚡ [INFO]';
        iconColor = '#06B6D4';
        channelId = 'smart_energy_normal_channel';
        vibrationPattern = [100];
        summaryText = '⚡ TÉLÉMÉTRIE ESP32';
        break;
    }

    const formattedTitle = `${titlePrefix} ${cleanTitle}`;

    // 2. High-Readability Telemetry Values & Multi-Line Layout
    const timeString = new Date().toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const metricParts: string[] = [];
    if (metrics) {
      if (typeof metrics.voltage === 'number') {
        metricParts.push(`${metrics.voltage.toFixed(1)} V`);
      }
      if (typeof metrics.current === 'number') {
        metricParts.push(`${metrics.current.toFixed(2)} A`);
      }
      if (typeof metrics.power === 'number') {
        if (metrics.power >= 1000) {
          metricParts.push(`${(metrics.power / 1000).toFixed(2)} kW`);
        } else {
          metricParts.push(`${Math.round(metrics.power)} W`);
        }
      }
      if (typeof metrics.frequency === 'number' && metrics.frequency > 0) {
        metricParts.push(`${metrics.frequency.toFixed(1)} Hz`);
      }
    }

    const bodySections: string[] = [];
    if (message) {
      bodySections.push(message);
    }
    if (metricParts.length > 0) {
      bodySections.push(`⚡ ${metricParts.join(' • ')}`);
    }
    if (detail) {
      bodySections.push(`🛡️ ${detail}`);
    }
    bodySections.push(`🕒 ${timeString} • Smart Énergie Monitor`);

    const formattedBody = bodySections.join('\n');

    // 3. Dispatch to Android Native (Capacitor) or Web Notification API
    if (this.isNative) {
      try {
        await this.createNotificationChannels();

        let hasPerm = await LocalNotifications.checkPermissions();
        if (hasPerm.display !== 'granted') {
          hasPerm = await LocalNotifications.requestPermissions();
        }

        if (hasPerm.display === 'granted') {
          // Generate 32-bit positive integer for Android notification ID
          const notifId = (Math.abs(this.hashString(typeKey)) % 90000) + 10000;

          await LocalNotifications.schedule({
            notifications: [
              {
                id: notifId,
                title: formattedTitle,
                body: formattedBody,
                summaryText: summaryText,
                channelId: channelId,
                smallIcon: 'ic_stat_smart_energy',
                largeIcon: 'ic_launcher',
                iconColor: iconColor,
                actionTypeId: 'SMART_ENERGY_NOTIF_ACTIONS',
                extra: {
                  level,
                  type: typeKey,
                  timestamp: now,
                  metrics,
                },
              },
            ],
          });
        }
      } catch (err) {
        console.warn('[NativeService] Schedule alert failed:', err);
      }
    } else {
      // Desktop / Web Notification Fallback
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          const notifOptions: any = {
            body: formattedBody,
            icon: '/icon-192.png',
            badge: '/notification-icon.png',
            tag: `alert-${typeKey}`,
            vibrate: vibrationPattern,
            renotify: true,
            requireInteraction: level === 'CRITICAL',
            data: { url: '/', level, typeKey, timestamp: now },
            actions: [
              { action: 'open_monitor', title: '⚡ Ouvrir le Moniteur' },
              { action: 'dismiss', title: 'Fermer' },
            ],
          };

          if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'SHOW_NOTIFICATION',
              title: formattedTitle,
              options: notifOptions,
            });
          } else {
            new Notification(formattedTitle, notifOptions);
          }
        } catch {}
      }
    }
  }

  /**
   * Helper to generate stable integer hash from a string
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  /**
   * Listen to network connectivity changes (Wi-Fi connected/lost)
   */
  public onNetworkChange(callback: (status: ConnectionStatus) => void): () => void {
    let handle: any = null;
    Network.addListener('networkStatusChange', (status) => {
      callback(status);
    }).then((h) => {
      handle = h;
    });

    return () => {
      if (handle && typeof handle.remove === 'function') {
        handle.remove();
      }
    };
  }

  /**
   * Listen to hardware Back Button on Android
   */
  public onBackButton(callback: () => void): () => void {
    if (!this.isNative) return () => {};
    let handle: any = null;
    App.addListener('backButton', () => {
      callback();
    }).then((h) => {
      handle = h;
    });

    return () => {
      if (handle && typeof handle.remove === 'function') {
        handle.remove();
      }
    };
  }

  /**
   * Probes directly if the ESP32 is physically accessible on the specified IP
   */
  public async probeEsp32(targetIp: string = '192.168.4.1'): Promise<boolean> {
    try {
      const cleanIp = targetIp.replace(/^http:\/\//, '').trim();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(`http://${cleanIp}/ping`, {
        signal: controller.signal,
        mode: 'cors',
        cache: 'no-store',
      });
      clearTimeout(timeout);
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const nativeService = new NativeService();

