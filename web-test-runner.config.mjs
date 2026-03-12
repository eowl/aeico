import { playwrightLauncher } from '@web/test-runner-playwright'
import { esbuildPlugin } from '@web/dev-server-esbuild'
import { cssInlinePlugin } from './test/plugins/cssInlinePlugin.mjs'

export default {
  files: 'test/**/*.test.ts',
  nodeResolve: true,
  browsers: [
    playwrightLauncher({ product: 'chromium' }),
  ],
  plugins: [
    // Handle Vite-specific `*.css?inline` imports — must come before esbuild
    cssInlinePlugin(),
    // Transpile TypeScript
    esbuildPlugin({ ts: true }),
  ],
}
