/**
 * Compose multiple mixins into a single mixin
 * 
 * This utility function allows you to combine multiple mixins in a functional way,
 * following the principle of "composition over inheritance".
 * 
 * @param mixins - Variable number of mixin functions to compose
 * @returns A function that takes a base class and returns the composed class
 * 
 * @example
 * ```typescript
 * import { compose } from './mixins/compose'
 * import { WithTheme } from './mixins/WithTheme'
 * import { WithI18n } from './mixins/WithI18n'
 * import AeicoElement from './AeicoElement'
 * 
 * // Compose multiple mixins
 * const MyBase = compose(WithTheme, WithI18n)(AeicoElement)
 * 
 * class MyComponent extends MyBase {
 *   // Now has both theme and i18n capabilities
 * }
 * ```
 * 
 * @example
 * ```typescript
 * // Select only the capabilities you need
 * const SimpleBase = compose(WithTheme)(AeicoElement)
 * 
 * class SimpleComponent extends SimpleBase {
 *   // Only has theme capability
 * }
 * ```
 */
export const compose = <T extends any[]>(...mixins: T) =>
  <U extends Constructor>(Base: U) =>
    mixins.reduce((acc, mixin) => mixin(acc), Base)

/**
 * Constructor type for mixin composition with Web Component lifecycle methods
 */
export type Constructor<T = {}> = new (...args: any[]) => T & {
  connectedCallback?(): void
  disconnectedCallback?(): void
}

/**
 * Mixin function type
 */
export type Mixin<T = {}> = <U extends Constructor>(Base: U) => Constructor<T> & U
