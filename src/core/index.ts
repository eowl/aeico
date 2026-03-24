/**
 * Core module exports
 * 
 * Provides the foundational classes for building Web Components with Aeico.
 * These are the building blocks that can be extended or composed with mixins.
 * 
 * @example
 * ```typescript
 * import { AeicoElement, AeicoField } from 'aeico/core'
 * import { compose, Themeable, Localizable } from 'aeico/mixins'
 * 
 * // Build your own base class
 * const MyBase = compose(Themeable, Localizable)(AeicoElement)
 * 
 * class MyComponent extends MyBase {
 *   // Your component implementation
 * }
 * ```
 */

// Base classes
export { default as AeicoBase } from './AeicoBase'
export { default as AeicoElement } from './AeicoElement'

// Composer (DOM Builder)
export { default as Composer } from './ElementBuilder'
export type { BuilderProps } from './ElementBuilder'

// Types
export type { AeicoBaseProps } from './AeicoBase'
export type { AeicoElementProps } from './AeicoElement'
export type { AeicoFieldProps, FieldAction, FieldElement } from '../components/AeicoField'
