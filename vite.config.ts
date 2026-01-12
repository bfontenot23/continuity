import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: 'public',
  server: {
    port: 3000,
    open: true,
    fs: {
      allow: ['..']
    }
  },
  build: {
    outDir: resolve(__dirname, 'public/dist'),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
