import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In dev, the app calls `/api/...` (same origin). This proxy forwards to the .NET API so you avoid
// browser CORS + self-signed HTTPS issues when the UI is on http://localhost:5173.
// Override target if needed: VITE_DEV_API_PROXY_TARGET=http://localhost:5238 npm run dev
const devApiTarget = process.env.VITE_DEV_API_PROXY_TARGET ?? 'https://localhost:7270'

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
