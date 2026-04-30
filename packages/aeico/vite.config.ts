import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  define: {
    __DEV__: 'import.meta.env.DEV',
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'Aeico',
    },
    rollupOptions: {
      // Bundle everything into aeico for simplicity — users get a single package
      external: [],
      output: [
        {
          format: 'es',
          exports: 'named',
          entryFileNames: '[name].js',
          chunkFileNames: 'chunks/[name].js',
        },
        {
          format: 'cjs',
          exports: 'named',
          entryFileNames: '[name].cjs',
          chunkFileNames: 'chunks/[name].cjs',
        },
      ],
    },
    sourcemap: true,
    minify: false,
    cssCodeSplit: false,
  },
  resolve: {
    alias: {
      'aeico-element': path.resolve(__dirname, '../aeico-element/src/index.ts'),
      'aeico-view': path.resolve(__dirname, '../aeico-view/src/index.ts'),
      'aeico-localize': path.resolve(__dirname, '../aeico-localize/src/index.ts'),
    },
  },
})
