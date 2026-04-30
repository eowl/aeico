import { playwrightLauncher } from '@web/test-runner-playwright'
import { esbuildPlugin } from '@web/dev-server-esbuild'

const TIMEOUT_MS = 3000

export default {
  files: 'test/specs/**/*.test.ts',
  nodeResolve: true,
  browsers: [
    playwrightLauncher({ product: 'chromium' }),
  ],
  plugins: [
    esbuildPlugin({ ts: true, target: 'es2022' }),
  ],
  testFramework: {
    config: {
      timeout: TIMEOUT_MS,
    },
  },
}
