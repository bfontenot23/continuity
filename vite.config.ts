import { defineConfig } from 'vite'

export default defineConfig({
  root: 'public',
  publicDir: 'assets',
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
