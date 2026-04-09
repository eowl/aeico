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
export { default as AeicoBase } from './aeico-base'
export { default as AeicoElement } from './aeico-element'

// Render context
export { getCurrentContext } from './render-context'
export type { Updatable } from './render-context'

// Template & render
export { html, render, getActiveBuilder } from './html'
export type { RenderResult } from './html'

// Composer (DOM Builder)
export { default as Composer } from './element-builder'
export type { BuilderProps } from './element-builder'

// Types
export type { AeicoBaseProps } from './aeico-base'
export type { AeicoElementProps } from './aeico-element'
export type { AeicoFieldProps, FieldAction, FieldElement } from '../components/aeico-field'
export type { PropertyType, Prop, Props, InferProps } from './types'
