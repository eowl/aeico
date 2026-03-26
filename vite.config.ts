import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: path.resolve(__dirname, 'src/index.ts'),
        core: path.resolve(__dirname, 'src/core/index.ts'),
        components: path.resolve(__dirname, 'src/components/index.ts'),
        mixins: path.resolve(__dirname, 'src/mixins/index.ts'),
        localize: path.resolve(__dirname, 'src/localize/index.ts'),
        utils: path.resolve(__dirname, 'src/utils/index.ts'),
      },
      name: 'Aeico',
      // Remove formats here, specify in output options instead
    },
    rollupOptions: {
      // No external dependencies for now, bundle everything
      external: [],
      output: [
        // ES Module format
        {
          format: 'es',
          exports: 'named',
          entryFileNames: '[name].js',
          chunkFileNames: 'chunks/[name].js',
        },
        // CommonJS format  
        {
          format: 'cjs',
          exports: 'named',
          entryFileNames: '[name].cjs',
          chunkFileNames: 'chunks/[name].cjs',
        }
      ]
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
