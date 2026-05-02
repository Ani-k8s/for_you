import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite config for Django integration
// This ensures that when built, the app looks for assets in /static/
export default defineConfig({
  plugins: [react()],
  base: '/', 
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true,
    },
  },
})
