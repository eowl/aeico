/**
 * aeico-page bundle entry
 *
 * Registers the aeico web components used by the default theme layout.
 * Built to assets/aeico.js via `vite build --config vite.bundle.config.ts`.
 */
import Button from '../../../src/components/button/button'
import ButtonGroup from '../../../src/components/button-group/button-group'

Button.register()
ButtonGroup.register()
