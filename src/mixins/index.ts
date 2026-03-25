/**
 * Mixins for extending AeicoElement with additional capabilities
 * 
 * This module provides a functional composition system for adding features
 * to components following the "composition over inheritance" principle.
 * 
 * @example
 * ```typescript
 * import { compose, Themeable, Localizable } from 'aeico/mixins'
 * import { AeicoElement } from 'aeico/core'
 * 
 * // Compose multiple capabilities
 * const MyBase = compose(Themeable, Localizable)(AeicoElement)
 * 
 * class MyComponent extends MyBase {
 *   // Now has theme and i18n support
 * }
 * ```
 */

export { compose } from './compose'
export type { Constructor, Mixin } from './compose'

export { Themeable } from './themeable'
export type { ThemeableProps } from './themeable'

export { Localizable } from './localize/localizable'
export type { LocalizableProps } from './localize/localizable'
