/**
 * Aeico — Lightweight Web Components Framework
 *
 * ```typescript
 * import { AeicoElement, html, render } from 'aeico'
 * import { t, locale } from 'aeico'
 * ```
 */

// Core — base classes
export { AeicoBase, AeicoElement } from 'aeico-core'
export type { AeicoBaseProps, AeicoElementProps } from 'aeico-core'

// Core — render context
export { getCurrentContext } from 'aeico-core'
export type { Updatable } from 'aeico-core'

// Core — styles
export { styleStore, StyleResult, supportAdoptStyle } from 'aeico-core'
export type { StyleEntry, StyleItem, StyleItems, StyleOptions, StyleScope } from 'aeico-core'

// Core — types
export type { PropertyType, Prop, Props, InferProps } from 'aeico-core'

// Decorators
export { prop, PROP_METADATA_KEY } from 'aeico-core'

// Mixins
export { compose, Themeable } from 'aeico-core'
export type { Constructor, Mixin, ThemeableProps } from 'aeico-core'

// View — rendering
export { ElementBuilder, html, render, getActiveBuilder, tags } from 'aeico-view'
export type { BuilderProps, RenderResult } from 'aeico-view'

// Localize — i18n
export { t, locale, LocaleStore, localeRegistry } from 'aeico-localize'
export type { LocaleProvider, LocaleRegistry } from 'aeico-localize'
