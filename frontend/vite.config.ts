import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In dev, the app calls `/api/...` (same origin). This proxy forwards to the .NET API so you avoid
// browser CORS + self-signed HTTPS issues when the UI is on http://localhost:5173.
// Default to HTTP (matches Properties/launchSettings.json) so the proxy works without trusting the dev HTTPS cert.
// Override if needed: VITE_DEV_API_PROXY_TARGET=https://localhost:7270 npm run dev
const devApiTarget = process.env.VITE_DEV_API_PROXY_TARGET ?? 'http://localhost:5238'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: devApiTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
