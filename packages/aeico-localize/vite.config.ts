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
      external: ['aeico-element'],
      output: [
        {
          format: 'es',
          exports: 'named',
          entryFileNames: '[name].js',
          chunkFileNames: 'chunks/[name].js',
          globals: { 'aeico-element': 'AeicoElement' },
        },
        {
          format: 'cjs',
          exports: 'named',
          entryFileNames: '[name].cjs',
          chunkFileNames: 'chunks/[name].cjs',
          globals: { 'aeico-element': 'AeicoElement' },
        },
      ],
    },
    sourcemap: true,
    minify: false,
  },
})
