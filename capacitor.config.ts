import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.smartenergy.monitor',
  appName: 'Smart Énergie Monitor',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    cleartext: true,
    allowNavigation: [
      '192.168.4.1',
      '192.168.4.*',
      '192.168.*.*',
      '10.*.*.*',
      '172.16.*.*',
      'localhost',
      '*',
    ],
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_smart_energy',
      iconColor: '#06B6D4',
      sound: 'beep.wav',
    },
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
