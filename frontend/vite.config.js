import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const backend = 'http://127.0.0.1:23567'
export default defineConfig({
  plugins: [react()],
  server: {
    port: 23568,
    strictPort: true,
    host: '127.0.0.1',
    proxy: {
      '/api': { target: backend, changeOrigin: true },
      '/media': { target: backend, changeOrigin: true },
    }
  }
})
