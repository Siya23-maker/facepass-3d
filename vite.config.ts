import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// GitHub Pages serves this project at https://siya23-maker.github.io/facepass-3d/
// so the finished build ("npm run build") must look for its files under /facepass-3d/.
// While developing ("npm run dev") the site lives at the root, "/".
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/facepass-3d/' : '/',
  plugins: [react()],
  server: { open: true }, // open the browser automatically on `npm run dev`
  build: { chunkSizeWarningLimit: 2000 }, // Three.js is big; that's expected
}))
