import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// El backend no tiene CORS: el front siempre llama a rutas relativas /api
// y Vite las reenvía a la API.
const proxy = {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
  },
}

export default defineConfig({
  plugins: [react()],
  server: { proxy },
  preview: { proxy },
})
