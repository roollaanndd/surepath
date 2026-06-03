import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
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
            maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
            skipWaiting: true,
            clientsClaim: true,
            cleanupOutdatedCaches: true,
          },
          manifest: {
            name: 'SurePath – Asuransi Digital',
            short_name: 'SurePath',
            description: 'Platform asuransi digital terpercaya Indonesia. Beli asuransi mobil, jiwa, perjalanan & properti. Klaim cepat via HP.',
            theme_color: '#16a34a',
            background_color: '#05080d',
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
              'pdf': ['jspdf', 'html2canvas'],
              'lucide': ['lucide-react'],
              'spline': ['@splinetool/react-spline', '@splinetool/runtime'],
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
