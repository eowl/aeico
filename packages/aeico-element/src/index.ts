const AEICO_DEV = true;

if (AEICO_DEV) {
  console.warn(
    '[aeico] Development mode. Not recommended for production! ' +
      'See https://github.com/eowl/aeico/blob/main/packages/aeico-element/docs/development-mode.md',
  );
}

// Base classes
export { default as AeicoBase } from './aeico-base';
export { default as AeicoElement } from './aeico-element';
export type { AeicoBaseProps } from './aeico-base';
export type { AeicoElementProps } from './aeico-element';

// Render context
export { getCurrentContext } from './render-context';
export type { Updatable } from './render-context';

// Types
export type {
  PropertyType,
  Prop,
  Props,
  InferProps,
  WatcherHandler,
  Watchers,
  ComputedProp,
  Computed,
} from './types';
export type { EmitOptions } from './events';
export { listenEvent, cleanupListeners } from './events';

// Styles
export { default as styleStore, StyleResult, supportAdoptStyle } from './styles';
export type { StyleEntry, StyleItem, StyleItems, StyleOptions, StyleScope } from './styles';

// Decorators
export { prop, PROP_METADATA_KEY, ACCESSOR_PROPS_KEY } from './decorators/prop';
export { watch, WATCHER_METADATA_KEY } from './decorators/watch';
export { computed, COMPUTED_METADATA_KEY } from './decorators/computed';
