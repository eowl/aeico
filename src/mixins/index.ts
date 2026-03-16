/**
 * Mixins for extending AeicoElement with additional capabilities
 * 
 * This module provides a functional composition system for adding features
 * to components following the "composition over inheritance" principle.
 * 
 * @example
 * ```typescript
 * import { compose, WithTheme, WithI18n } from 'aeico/mixins'
 * import { AeicoElement } from 'aeico/core'
 * 
 * // Compose multiple capabilities
 * const MyBase = compose(WithTheme, WithI18n)(AeicoElement)
 * 
 * class MyComponent extends MyBase {
 *   // Now has theme and i18n support
 * }
 * ```
 */

export { compose } from './compose'
export type { Constructor, Mixin } from './compose'

export { WithTheme } from './WithTheme'
export type { WithThemeInterface } from './WithTheme'

export { WithI18n } from './WithI18n'
export type { WithI18nInterface } from './WithI18n'
