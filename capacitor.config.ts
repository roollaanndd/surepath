import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.myinsurepath.os',
  appName: 'SurePath',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#fafaf9',
    webContentsDebuggingEnabled: false,
  },
};

export default config;
