/**
 * Core module exports
 * 
 * Provides the foundational classes for building Web Components with Aeico.
 * These are the building blocks that can be extended or composed with mixins.
 * 
 * @example
 * ```typescript
 * import { AeicoElement, AeicoField } from 'aeico/core'
 * import { compose, WithTheme, WithI18n } from 'aeico/mixins'
 * 
 * // Build your own base class
 * const MyBase = compose(WithTheme, WithI18n)(AeicoElement)
 * 
 * class MyComponent extends MyBase {
 *   // Your component implementation
 * }
 * ```
 */

// Base classes
export { default as AeicoElement } from './AeicoElement'
export { default as AeicoField } from './AeicoField'

// Types
export type { AeicoElementProps } from './AeicoElement'
export type { AeicoFieldProps, FieldAction, FieldElement } from './AeicoField'
