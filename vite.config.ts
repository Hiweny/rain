import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 项目级 GitHub Pages 部署在 https://<user>.github.io/rain/
export default defineConfig({
  base: '/rain/',
  plugins: [react()],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1200,
  },
})
