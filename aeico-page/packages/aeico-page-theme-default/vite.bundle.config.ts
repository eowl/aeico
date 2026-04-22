import { defineConfig } from 'vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'bundle-entry.ts'),
      name: 'AeicoPage',
      formats: ['iife'],
      fileName: () => 'aeico.js'
    },
    outDir: path.resolve(__dirname, 'assets'),
    emptyOutDir: false,
    rollupOptions: {
      output: {
        assetFileNames: '[name][extname]'
      }
    }
  }
})
