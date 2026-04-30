import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  root: path.resolve(__dirname, 'example'),
  esbuild: {
    target: 'es2022',
  },
  define: {
    __DEV__: 'true',
  },
  resolve: {
    alias: {
      'aeico-view': path.resolve(__dirname, 'packages/aeico-view/src/index.ts'),
      'aeico-core': path.resolve(__dirname, 'packages/aeico-core/src/index.ts'),
      'aeico-localize': path.resolve(__dirname, 'packages/aeico-localize/src/index.ts'),
      'aeico': path.resolve(__dirname, 'packages/aeico/src/index.ts'),
    },
  },
  server: {
    port: 3100,
    open: true,
  },
})
