import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Sur ton ordinateur (npm run dev), les demandes au coach (/api/...)
    // sont envoyées à la version en ligne sur Vercel, là où se trouve la clé secrète.
    proxy: {
      '/api': { target: 'https://noud-nine.vercel.app', changeOrigin: true },
    },
  },
})
