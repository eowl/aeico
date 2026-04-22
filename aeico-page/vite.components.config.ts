import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/components/bundle.ts',
      formats: ['iife'],
      name: 'AeicoPageComponents',
      fileName: () => 'components.js'
    },
    outDir: 'theme/assets',
    emptyOutDir: false,
    sourcemap: false,
    minify: true
  }
})
