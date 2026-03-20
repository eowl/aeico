import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  root: path.resolve(__dirname, 'benchmark'),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3200,
    open: true,
  },
  build: {
    outDir: path.resolve(__dirname, 'dist-benchmark'),
    emptyOutDir: true,
  },
})
