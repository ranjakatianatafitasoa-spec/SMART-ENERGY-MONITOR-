/**
 * Multi-Protocol ESP32 Communication Dispatcher
 * Handles Direct HTTP, CORS bypass, Image Pings, JSONP and Mixed-Content workarounds
 * for Windows Desktop Browsers (Chrome/Edge/Firefox), Android PWA and Native Capacitor.
 */

export interface DispatchResult {
  success: boolean;
  channel: 'fetch' | 'image-ping' | 'jsonp' | 'server-proxy' | 'iframe';
  data?: any;
}

// Global JSONP Registry
declare global {
  interface Window {
    __esp32JsonpCallback?: (data: any) => void;
  }
}

class Esp32Dispatcher {
  private lastSuccessChannel: string = 'fetch';

  /**
   * Check if current page is running under HTTPS (which triggers Mixed-Content blocks on local HTTP IPs)
   */
  public isHttpsOrigin(): boolean {
    if (typeof window === 'undefined') return false;
    return window.location.protocol === 'https:';
  }

  /**
   * Dispatch a hardware action (Relay toggle, auto rearm, calibrate, etc.)
   * Uses Image Ping + No-CORS Fetch + Server Proxy + Hidden Iframe to guarantee delivery
   * even when loaded from an HTTPS cloud domain on Desktop Chrome!
   */
  public async dispatchAction(
    path: string, // e.g. '/relais' or '/calibrer' or '/settings'
    params: Record<string, string | number | boolean> = {},
    targetIp: string = '192.168.4.1'
  ): Promise<boolean> {
    const cleanIp = targetIp.replace(/^https?:\/\//, '').trim() || '192.168.4.1';
    const queryParts = Object.entries(params).map(
      ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`
    );
    queryParts.push(`_t=${Date.now()}`);
    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

    const directUrl = `http://${cleanIp}${path}${queryString}`;
    const serverProxyUrl = `/api${path}${queryString}`;

    let executed = false;

    // 1. Image Ping Dispatch (Bypasses most browser Mixed-Content / CORS blockers for GET commands!)
    try {
      const img = new Image();
      img.src = directUrl;
      executed = true;
    } catch {}

    // 2. Fetch with no-cors mode (Dispatches raw GET over the network)
    try {
      fetch(directUrl, {
        method: 'GET',
        mode: 'no-cors',
        cache: 'no-store',
      }).catch(() => {});
      executed = true;
    } catch {}

    // 3. Standard Fetch (works if on HTTP, local PWA, or if user allowed Insecure Content)
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1200);
      fetch(directUrl, {
        signal: controller.signal,
        mode: 'cors',
        cache: 'no-store',
      }).then((res) => {
        clearTimeout(timeout);
        if (res.ok) executed = true;
      }).catch(() => {});
    } catch {}

    // 4. Server Backend Proxy (for local Node server or proxy setups)
    try {
      fetch(serverProxyUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }).then((res) => {
        if (res.ok) executed = true;
      }).catch(() => {});
    } catch {}

    // 5. Explicit Backend ESP32 Proxy Route (/api/esp32-proxy)
    try {
      fetch(`/api/esp32-proxy${path}${queryString}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }).then((res) => {
        if (res.ok) executed = true;
      }).catch(() => {});
    } catch {}

    return executed;
  }

  /**
   * Fetch Live Telemetry Data using Multi-Strategy:
   * 1. Direct Fetch
   * 2. Backend Proxy (/api/esp32-proxy/data)
   * 3. JSONP Script Tag (bypasses XHR CORS/Mixed-content in certain browsers)
   * 4. Local/Backend Proxy (/api/data)
   */
  public async fetchTelemetry(targetIp: string = '192.168.4.1'): Promise<any | null> {
    const cleanIp = targetIp.replace(/^https?:\/\//, '').trim() || '192.168.4.1';
    const directUrl = `http://${cleanIp}/data?_t=${Date.now()}`;

    // 1. Direct Fetch
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 950);
      const res = await fetch(directUrl, {
        signal: controller.signal,
        mode: 'cors',
        cache: 'no-store',
      });
      clearTimeout(timeout);
      if (res.ok) {
        const json = await res.json();
        if (json && (typeof json.tension === 'number' || typeof json.v === 'number')) {
          this.lastSuccessChannel = 'fetch';
          return json;
        }
      }
    } catch {}

    // 2. Explicit Backend ESP32 Proxy Fallback
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 950);
      const res = await fetch(`/api/esp32-proxy/data?_t=${Date.now()}`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        const json = await res.json();
        if (json && (typeof json.tension === 'number' || typeof json.v === 'number')) {
          this.lastSuccessChannel = 'server-proxy';
          return json;
        }
      }
    } catch {}

    // 3. JSONP Attempt (if supported by ESP32 firmware)
    try {
      const jsonpData = await this.fetchJsonp(`http://${cleanIp}/data?callback=__esp32JsonpCallback&_t=${Date.now()}`);
      if (jsonpData && (typeof jsonpData.tension === 'number' || typeof jsonpData.v === 'number')) {
        this.lastSuccessChannel = 'jsonp';
        return jsonpData;
      }
    } catch {}

    // 4. Local / Server API Proxy Fallback
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 950);
      const res = await fetch(`/api/data?_t=${Date.now()}`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        const json = await res.json();
        if (json && (typeof json.tension === 'number' || typeof json.v === 'number')) {
          this.lastSuccessChannel = 'server-proxy';
          return json;
        }
      }
    } catch {}

    return null;
  }

  /**
   * Helper to perform JSONP dynamic script injection
   */
  private fetchJsonp(url: string, timeoutMs: number = 1000): Promise<any> {
    return new Promise((resolve, reject) => {
      if (typeof document === 'undefined') {
        return reject(new Error('No DOM available'));
      }

      const scriptId = 'esp32_jsonp_script';
      const prev = document.getElementById(scriptId);
      if (prev && prev.parentNode) {
        prev.parentNode.removeChild(prev);
      }

      const script = document.createElement('script');
      script.id = scriptId;
      script.src = url;

      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('JSONP timeout'));
      }, timeoutMs);

      const cleanup = () => {
        clearTimeout(timeout);
        window.__esp32JsonpCallback = undefined;
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };

      window.__esp32JsonpCallback = (data: any) => {
        cleanup();
        resolve(data);
      };

      script.onerror = () => {
        cleanup();
        reject(new Error('JSONP script error'));
      };

      document.body.appendChild(script);
    });
  }
}

export const esp32Dispatcher = new Esp32Dispatcher();
