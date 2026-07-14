import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png', 'pwa-maskable-512.png'],
          workbox: {
            maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
            skipWaiting: true,
            clientsClaim: true,
            cleanupOutdatedCaches: true,
          },
          manifest: {
            name: 'SurePath – Asuransi Digital',
            short_name: 'SurePath',
            description: 'Platform asuransi digital terpercaya Indonesia. Beli asuransi mobil, jiwa, perjalanan & properti. Klaim cepat via HP.',
            // Brand emerald for PWA status bar when installed — was #ffffff (looked like a generic web page, not an app)
            theme_color: '#003B2F',
            background_color: '#003B2F',
            display: 'standalone',
            orientation: 'portrait',
            start_url: '/',
            scope: '/',
            lang: 'id',
            categories: ['finance', 'business'],
            icons: [
              {
                src: 'pwa-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
              },
              {
                src: 'pwa-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
              },
              {
                src: 'pwa-maskable-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
              },
              {
                src: 'apple-touch-icon.png',
                sizes: '180x180',
                type: 'image/png',
                purpose: 'any',
              },
            ],
            screenshots: [
              {
                src: 'logo.png',
                sizes: '3508x2481',
                type: 'image/png',
                form_factor: 'wide',
                label: 'SurePath Dashboard',
              },
            ],
          },
        })
      ],
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              'react-vendor': ['react', 'react-dom'],
              'supabase': ['@supabase/supabase-js'],
              // html2canvas removed — was a phantom entry (package isn't installed).
              // jspdf is the only PDF dep actually used.
              'pdf': ['jspdf'],
              'lucide': ['lucide-react'],
              // spline removed — @splinetool/* is installed but never imported anywhere.
              // Saves ~250 KB in node_modules and removes a confusing chunk from the build.
              // phosphor removed — ModernIcon.tsx was dead code, deleted in v1.42.0.
              // recharts is heavy (~200KB) — chunk it separately so it only loads on admin analytics.
              'recharts': ['recharts'],
            },
          },
        },
        chunkSizeWarningLimit: 1000,
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
