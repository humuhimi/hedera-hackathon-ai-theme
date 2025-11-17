import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Point Vite to the repo root for env files
  envDir: path.resolve(__dirname, '..'),
  server: {
    port: 3000,
  },
})
