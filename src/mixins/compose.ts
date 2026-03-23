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
 * import { Themeable } from './mixins/Themeable'
 * import { Localizable } from './mixins/Localizable'
 * import AeicoElement from './AeicoElement'
 * 
 * // Compose multiple mixins
 * const MyBase = compose(Themeable, Localizable)(AeicoElement)
 * 
 * class MyComponent extends MyBase {
 *   // Now has both theme and i18n capabilities
 * }
 * ```
 * 
 * @example
 * ```typescript
 * // Select only the capabilities you need
 * const SimpleBase = compose(Themeable)(AeicoElement)
 * 
 * class SimpleComponent extends SimpleBase {
 *   // Only has theme capability
 * }
 * ```
 */
export function compose(...mixins: Mixin[]) {
  return <T extends Constructor>(Base: T): T => {
    return mixins.reduce((acc, mixin) => mixin(acc), Base as Constructor) as T
  }
}

/**
 * Constructor type for mixin composition with Web Component lifecycle methods
 */
export type Constructor<T = object> = new (...args: any[]) => T & {
  connectedCallback?(): void
  disconnectedCallback?(): void
}

/**
 * Mixin function type
 */
export type Mixin<T = object> = <U extends Constructor>(Base: U) => Constructor<T> & U
