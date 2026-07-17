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
            // Precache = app shell only. The old config precached ~4.2 MB / 92 files
            // on first visit — all portal chunks + heavy vendors — competing with the
            // page's own critical requests on mobile connections. Heavy lazy chunks are
            // excluded here and cached on demand by runtimeCaching below (hashed
            // filenames are immutable, so CacheFirst is safe and offline still works
            // for everything the user has actually opened).
            globIgnores: [
              '**/AgentPortal-*.js', '**/AdminPortal-*.js', '**/AdminViews-*.js',
              '**/OperatorPortal-*.js', '**/InsurerPortal-*.js', '**/CustomerPortal-*.js',
              '**/B2BPortal-*.js', '**/CarInsuranceWizard-*.js', '**/ClaimManager-*.js',
              '**/InsurerAdmin-*.js', '**/AgentArt-*.js', '**/AnalyticsDashboard-*.js',
              '**/jspdf*.js', '**/stnkOcr-*.js', '**/geminiService-*.js',
              '**/html2canvas*.js', '**/index.es-*.js', '**/purify.es-*.js',
              '**/quotationSlipAdapter-*.js', '**/quotationService-*.js', '**/aiGateway-*.js',
              '**/logo.jpg', '**/play-store-*.png', '**/screenshot-*.png',
            ],
            runtimeCaching: [
              {
                // Hashed build assets not in the precache — immutable, cache on first use
                urlPattern: /\/assets\/.*\.(?:js|css)$/,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'sp-assets',
                  expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 365 },
                },
              },
              {
                urlPattern: /\.(?:png|jpg|jpeg|svg|webp|ico)$/,
                handler: 'StaleWhileRevalidate',
                options: {
                  cacheName: 'sp-images',
                  expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
                },
              },
              {
                urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/,
                handler: 'StaleWhileRevalidate',
                options: { cacheName: 'google-fonts-css', expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 365 } },
              },
              {
                urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/,
                handler: 'CacheFirst',
                options: { cacheName: 'google-fonts-woff', expiration: { maxEntries: 24, maxAgeSeconds: 60 * 60 * 24 * 365 } },
              },
            ],
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
              'lucide': ['lucide-react'],
              // spline removed — @splinetool/* is installed but never imported anywhere.
              // phosphor removed — ModernIcon.tsx was dead code, deleted in v1.42.0.
              // 'pdf' (jspdf) and 'recharts' manual chunks removed: manual chunks
              // absorb shared dependencies, which forced the MAIN entry to statically
              // import both chunks (~240 KB) on every page — including the homepage.
              // jspdf is dynamic-imported and recharts only lives in the lazy
              // AnalyticsDashboard, so natural code-splitting already isolates them.
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
