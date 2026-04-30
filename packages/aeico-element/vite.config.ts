import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  define: {
    __DEV__: 'import.meta.env.DEV',
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'AeicoElement',
    },
    rollupOptions: {
      external: ['aeico-view'],
      output: [
        {
          format: 'es',
          exports: 'named',
          entryFileNames: '[name].js',
          chunkFileNames: 'chunks/[name].js',
          globals: { 'aeico-view': 'AeicoView' },
        },
        {
          format: 'cjs',
          exports: 'named',
          entryFileNames: '[name].cjs',
          chunkFileNames: 'chunks/[name].cjs',
          globals: { 'aeico-view': 'AeicoView' },
        },
      ],
    },
    sourcemap: true,
    minify: false,
    cssCodeSplit: false,
  },
})
