/**
 * Aeico - Lightweight Web Components Library
 * 
 * Main entry point — exports core classes, mixins, configuration, and utilities.
 * 
 * ```typescript
 * import { AeicoElement, setComponentConfig, Themeable } from 'aeico'
 * import { SelectField, Button } from 'aeico/components'
 * ```
 * 
 * Note: Components are exported from `aeico/components`, not from `aeico`.
 */

export { default as AeicoBase } from './core/aeico-base'
export { default as AeicoElement } from './core/aeico-element'
export { default as AeicoField } from './components/aeico-field'
export type { AeicoBaseProps } from './core/aeico-base'
export type { AeicoElementProps } from './core/aeico-element'
export type { AeicoFieldProps, FieldAction, FieldElement } from './components/aeico-field'

export { getCurrentContext } from './core/render-context'
export type { Updatable } from './core/render-context'

export { compose } from './mixins/compose'
export type { Constructor, Mixin } from './mixins/compose'
export { Themeable } from './mixins/themeable'
export type { ThemeableProps } from './mixins/themeable'
export { t, locale, LocaleStore, localeRegistry } from './localize/index'
export type { LocaleProvider, LocaleRegistry } from './localize/index'

export { createEventEmitter } from './core/events'
export type { ComponentEventEmitter } from './core/events'

export { default as ElementBuilder } from './core/element-builder'
export type { BuilderProps } from './core/element-builder'

export { html, render, getActiveBuilder } from './core/html'
export type { RenderResult } from './core/html'

export { default as styleStore } from './core/styles'
export { StyleResult, supportAdoptStyle } from './core/styles'

export type { PropertyType, Prop, Props, InferProps } from './core/types'
