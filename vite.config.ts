import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'Aeico',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`
    },
    rollupOptions: {
      // No external dependencies for now, bundle everything
      external: [],
      output: {
        // Preserve module structure for better tree-shaking
        preserveModules: false,
        exports: 'named'
      }
    },
    sourcemap: true,
    minify: false, // Keep readable for development
    cssCodeSplit: false // Inline CSS into JS
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
})
