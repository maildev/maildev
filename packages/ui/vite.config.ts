import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        // API routes are served under the /api prefix (see @maildev/api
        // registerRoutes), so forward the path unchanged — do NOT strip /api.
        target: 'http://localhost:1080',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:1080',
        ws: true,
        // Suppress EPIPE errors when API server restarts
        configure: (proxy) => {
          proxy.on('error', (err) => {
            if ((err as NodeJS.ErrnoException).code !== 'EPIPE') {
              console.error('WebSocket proxy error:', err.message)
            }
          })
        },
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
