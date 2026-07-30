import { defineConfig } from 'vite'

export default defineConfig({
  esbuild: {
    target: 'es2022',
  },
  server: {
    port: 3200,
  },
})
