/**
 * Aeico — Lightweight Web Components Framework
 *
 * ```typescript
 * import { AeicoElement, html, render } from 'aeico'
 * import { t, locale } from 'aeico'
 * ```
 */

// Core — base classes
export { AeicoBase, AeicoElement } from 'aeico-element'
export type { AeicoBaseProps, AeicoElementProps } from 'aeico-element'

// Core — render context
export { getCurrentContext } from 'aeico-element'
export type { Updatable } from 'aeico-element'

// Core — styles
export { styleStore, StyleResult, supportAdoptStyle } from 'aeico-element'
export type { StyleEntry, StyleItem, StyleItems, StyleOptions, StyleScope } from 'aeico-element'

// Core — types
export type { PropertyType, Prop, Props, InferProps } from 'aeico-element'

// Decorators
export { prop, PROP_METADATA_KEY } from 'aeico-element'

// Mixins
export { compose, Themeable } from 'aeico-element'
export type { Constructor, Mixin, ThemeableProps } from 'aeico-element'

// View — rendering
export { ElementBuilder, html, render, getActiveBuilder, tags } from 'aeico-view'
export type { BuilderProps, RenderResult } from 'aeico-view'

// Localize — i18n
export { t, locale, LocaleStore, localeRegistry } from 'aeico-localize'
export type { LocaleProvider, LocaleRegistry } from 'aeico-localize'
