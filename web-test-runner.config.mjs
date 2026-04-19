import { playwrightLauncher } from '@web/test-runner-playwright'
import { esbuildPlugin } from '@web/dev-server-esbuild'
import { cssInlinePlugin } from './test/plugins/cssInline-plugin.mjs'
import { buildTestRunnerHtml } from './test/helpers/test-runner-html.mjs'

const TIMEOUT_MS = 3000

export default {
  files: 'test/specs/**/*.test.ts',
  nodeResolve: true,
  browsers: [
    playwrightLauncher({ product: 'chromium' }),
  ],
  plugins: [
    // Handle Vite-specific `*.css?inline` imports — must come before esbuild
    cssInlinePlugin(),
    // Transpile TypeScript
    esbuildPlugin({ ts: true, target: 'es2022' }),
  ],
  // Mocha timeout: any it() / before() / beforeEach() that hangs is auto-failed
  testFramework: {
    config: {
      timeout: TIMEOUT_MS,
    },
  },
  // Patch customElements.whenDefined globally so any unresolved tag name
  // produces a clear error instead of hanging forever — regardless of whether
  // the test uses the helper or calls the native API directly.
  testRunnerHtml: (testRunnerImport) => buildTestRunnerHtml(testRunnerImport, TIMEOUT_MS),
}
