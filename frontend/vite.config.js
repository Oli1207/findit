import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'auto',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectManifest: {
    maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // limite à 5 MiB
  },
      devOptions: {
        enabled: true,
        navigateFallback: 'index.html',
        type: 'module',
      },
      includeAssets: ['icons/favicon.png', 'icons/apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'FindIt',
        short_name: 'FindIt',
        description: 'Trouvez tout, facilement.',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait',
        icons: [
          {
            src: 'icons/web-app-manifest-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/web-app-manifest-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: 'icons/icon-128.png',
            sizes: '128x128',
            purpose: 'any',
          },
          {
            src: 'icons/icon-144.png',
            sizes: '144x144',
            purpose: 'any',
          },
          {
            src: 'icons/icon-257.png',
            sizes: '257x257',
            purpose: 'any',
          },
          {
            src: 'icons/icon-72.png',
            sizes: '72x72',
            purpose: 'any',
          },
          {
            src: 'icons/favicon.ico',
            sizes: '32x32',
            purpose: 'any',
          }
        ]
      }
    })
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  build: {
    minify: false
  },
})
