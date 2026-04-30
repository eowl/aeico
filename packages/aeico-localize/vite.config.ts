import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  define: {
    __DEV__: 'import.meta.env.DEV',
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'AeicoLocalize',
    },
    rollupOptions: {
      external: ['aeico-core'],
      output: [
        {
          format: 'es',
          exports: 'named',
          entryFileNames: '[name].js',
          chunkFileNames: 'chunks/[name].js',
          globals: { 'aeico-core': 'AeicoCore' },
        },
        {
          format: 'cjs',
          exports: 'named',
          entryFileNames: '[name].cjs',
          chunkFileNames: 'chunks/[name].cjs',
          globals: { 'aeico-core': 'AeicoCore' },
        },
      ],
    },
    sourcemap: true,
    minify: false,
  },
  resolve: {
    alias: {
      'aeico-core': path.resolve(__dirname, '../aeico-core/src/index.ts'),
    },
  },
})
