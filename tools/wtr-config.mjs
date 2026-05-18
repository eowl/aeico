import { playwrightLauncher } from '@web/test-runner-playwright'
import { esbuildPlugin } from '@web/dev-server-esbuild'
import { buildTestRunnerHtml } from './test-runner-html.mjs'

const TIMEOUT_MS = 3000

/**
 * Creates a shared WTR config for aeico packages.
 *
 * @param {object}   [opts]
 * @param {import('@web/test-runner').TestRunnerPlugin[]} [opts.extraPlugins=[]]
 *   Additional dev-server plugins (e.g. cssInlinePlugin).
 * @param {boolean}  [opts.useTestRunnerHtml=false]
 *   Inject the custom HTML template that patches customElements.whenDefined()
 *   and document.createElement() to fail fast on unknown tag names.
 */
export function createWtrConfig({ extraPlugins = [], useTestRunnerHtml = false } = {}) {
  /** @type {import('@web/test-runner').TestRunnerConfig} */
  const config = {
    files: 'test/specs/**/*.test.ts',
    nodeResolve: true,
    browsers: [playwrightLauncher({ product: 'chromium' })],
    plugins: [
      ...extraPlugins,
      esbuildPlugin({ ts: true, target: 'es2022', define: { '__DEV__': 'false' } }),
    ],
    testFramework: {
      config: { timeout: TIMEOUT_MS },
    },
  }

  if (useTestRunnerHtml) {
    config.testRunnerHtml = (testRunnerImport) =>
      buildTestRunnerHtml(testRunnerImport, TIMEOUT_MS)
  }

  return config
}
