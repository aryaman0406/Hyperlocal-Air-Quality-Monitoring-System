import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const normalizeProxyTarget = (value?: string) => {
  const fallback = 'http://localhost:8000'
  const candidate = (value || fallback).trim()

  if (/^https?:\/\//i.test(candidate)) {
    return candidate
  }

  return `http://${candidate.replace(/^\/+/, '')}`
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: normalizeProxyTarget(process.env.VITE_API_BASE_URL || process.env.VITE_API_URL),
        changeOrigin: true,
      },
      '/ws': {
        target: normalizeProxyTarget(process.env.VITE_API_BASE_URL || process.env.VITE_API_URL),
        changeOrigin: true,
        ws: true,
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          leaflet: ['leaflet', 'react-leaflet'],
        }
      }
    }
  }
})
