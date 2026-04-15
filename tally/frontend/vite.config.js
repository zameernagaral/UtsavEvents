import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'


import { cloudflare } from "@cloudflare/vite-plugin";


export default defineConfig({
  plugins: [tailwindcss(), react(), cloudflare()],
server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      }
    }
  }
})