import { cssInlinePlugin } from './test/plugins/cssInline-plugin.mjs'
import { createWtrConfig } from '../../tools/wtr-config.mjs'

export default createWtrConfig({
  extraPlugins: [cssInlinePlugin()],
  useTestRunnerHtml: true,
})
