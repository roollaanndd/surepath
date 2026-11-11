import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.myinsurepath.os',
  appName: 'SurePath',
  webDir: 'dist',
  // v2.8.21 — eksplisit: WebView Android tidak boleh pinch-zoom (komplain
  // owner "di app masih bisa di zoom"). Default Capacitor 6+ memang false,
  // tapi kebijakan "app terasa native" disematkan di sini agar tidak
  // bergantung pada default upstream; lock runtime (services/appViewport.ts)
  // tetap lapisan keduanya.
  android: {
    zoomEnabled: false,
  }
};

export default config;
