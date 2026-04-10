import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In dev, the app calls `/api/...` (same origin). This proxy forwards to the .NET API so you avoid
// browser CORS + self-signed HTTPS issues when the UI is on http://localhost:5173.
// Default to HTTP (matches Properties/launchSettings.json) so the proxy works without trusting the dev HTTPS cert.
// Use 127.0.0.1 so Node does not hit IPv6 ::1 when Kestrel is only on IPv4 loopback (common on Windows).
// Override if needed: VITE_DEV_API_PROXY_TARGET=https://localhost:7270 npm run dev
const devApiTarget = process.env.VITE_DEV_API_PROXY_TARGET ?? 'http://127.0.0.1:5238'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: devApiTarget,
        changeOrigin: true,
        secure: false,
        // The social studio can take 60–120s when scoring + LLM generation runs.
        timeout: 300_000,
        proxyTimeout: 300_000,
      },
    },
  },
})
