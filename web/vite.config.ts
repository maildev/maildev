import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Asset paths must be relative so the build works behind any
  // MAILDEV_BASE_PATHNAME prefix when served by Express.
  base: './',
  plugins: [svelte(), tailwindcss()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    port: 5173,
    proxy: {
      '/email': 'http://localhost:1080',
      '/config': 'http://localhost:1080',
      '/healthz': 'http://localhost:1080',
      '/reloadMailsFromDirectory': 'http://localhost:1080',
      '/socket.io': { target: 'ws://localhost:1080', ws: true },
    },
  },
})
