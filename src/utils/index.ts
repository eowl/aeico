/**
 * Utilities module exports
 * 
 * Helpful utilities for working with Aeico components and styles.
 * 
 * @example
 * ```typescript
 * import { styleStore, createFieldCssVars } from 'aeico/utils'
 * 
 * // Preload a custom style
 * styleStore.preload('my-style', '.my-class { color: red; }')
 * ```
 */

// Style utilities
export { default as styleStore, css } from './style-store'

// Event utilities are re-exported from main index
// Style adapter is internal, not exported
