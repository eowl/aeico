// Base classes
export { default as AeicoBase } from './core/aeico-base'
export { default as AeicoElement } from './core/aeico-element'
export type { AeicoBaseProps } from './core/aeico-base'
export type { AeicoElementProps } from './core/aeico-element'

// Render context
export { getCurrentContext } from './core/render-context'
export type { Updatable } from './core/render-context'

// Types
export type { PropertyType, Prop, Props, InferProps, WatcherHandler, Watchers } from './core/types'
export type { EmitOptions } from './core/events'

// Styles
export { default as styleStore, StyleResult, supportAdoptStyle } from './core/styles'
export type { StyleEntry, StyleItem, StyleItems, StyleOptions, StyleScope } from './core/styles'

// Decorators
export { prop, PROP_METADATA_KEY, ACCESSOR_PROPS_KEY } from './decorators/prop'
export { watch, WATCHER_METADATA_KEY } from './decorators/watch'
export { computed, COMPUTED_METADATA_KEY } from './decorators/computed'

// Mixins
export { compose } from './mixins/compose'
export type { Constructor, Mixin } from './mixins/compose'
export { Themeable } from './mixins/themeable'
export type { ThemeableProps } from './mixins/themeable'
