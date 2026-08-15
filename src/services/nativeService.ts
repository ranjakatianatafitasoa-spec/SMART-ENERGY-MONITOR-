import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Network, ConnectionStatus } from '@capacitor/network';
import { App } from '@capacitor/app';

export interface NativePermissionsStatus {
  notificationsGranted: boolean;
  isNative: boolean;
  networkStatus: ConnectionStatus | null;
}

class NativeService {
  private isNative: boolean = Capacitor.isNativePlatform();
  private notificationsPermissionGranted: boolean = false;
  private channelCreated: boolean = false;
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
      // 1. Check & query network status
      const netStatus = await Network.getStatus();
      status.networkStatus = netStatus;
    } catch {
      // Fallback for web environments
    }

    if (this.isNative) {
      try {
        // Create Android High-Priority Notification Channel
        await this.createNotificationChannel();

        // Check if permission is already granted or needs to be requested
        const check = await LocalNotifications.checkPermissions();
        if (check.display === 'granted') {
          this.notificationsPermissionGranted = true;
          status.notificationsGranted = true;
        } else if (check.display === 'prompt' || check.display === 'prompt-with-rationale') {
          // Request native permission on first launch
          const req = await LocalNotifications.requestPermissions();
          this.notificationsPermissionGranted = req.display === 'granted';
          status.notificationsGranted = this.notificationsPermissionGranted;
        }
      } catch (err) {
        console.warn('[NativeService] Permission request notice:', err);
      }
    } else {
      // Web Notification API fallback
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
   * Creates Android Notification Channel with sound & vibration
   */
  private async createNotificationChannel(): Promise<void> {
    if (!this.isNative || this.channelCreated) return;
    try {
      await LocalNotifications.createChannel({
        id: 'smart_energy_critical_alerts',
        name: 'Alertes Électriques d\'Urgence',
        description: 'Notifications pour surtension, coupure, surintensité et état du relais',
        importance: 5, // High priority / Heads-up
        visibility: 1, // Public
        sound: 'beep.wav',
        vibration: true,
        lights: true,
        lightColor: '#06B6D4',
      });
      this.channelCreated = true;
    } catch {
      // Channel creation fallback
    }
  }

  /**
   * Send a rich native alert notification
   */
  public async sendAlertNotification(
    typeKey: 'surtension' | 'soustension' | 'surintensite' | 'surpuissance' | 'deconnexion' | 'connexion' | 'relais_off' | 'normal',
    title: string,
    body: string
  ): Promise<void> {
    // Prevent flood: throttle same notification key to once every 10 seconds
    const now = Date.now();
    if (this.lastAlertTimestamp[typeKey] && now - this.lastAlertTimestamp[typeKey] < 10000) {
      return;
    }
    this.lastAlertTimestamp[typeKey] = now;

    if (this.isNative) {
      try {
        const hasPerm = await LocalNotifications.checkPermissions();
        if (hasPerm.display === 'granted') {
          const notifId = Math.floor(Math.random() * 100000) + 1;
          await LocalNotifications.schedule({
            notifications: [
              {
                id: notifId,
                title,
                body,
                channelId: 'smart_energy_critical_alerts',
                smallIcon: 'ic_stat_icon_config_sample',
                iconColor: '#06B6D4',
                extra: { type: typeKey },
              },
            ],
          });
        }
      } catch (err) {
        console.warn('[NativeService] Schedule alert failed:', err);
      }
    } else {
      // Browser / ServiceWorker Notification fallback
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'SHOW_NOTIFICATION',
              title,
              body,
              tag: `alert-${typeKey}`,
            });
          } else {
            new Notification(title, {
              body,
              icon: '/icon-192.png',
              tag: `alert-${typeKey}`,
            });
          }
        } catch {}
      }
    }
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
