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
export { default as styleStore } from './utils/styleStore'

// Type guards
export { isSelectOption } from './types'

// Event utilities are re-exported from main index
// Style adapter is internal, not exported
