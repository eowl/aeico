/**
 * Aeico - Lightweight Web Components Framework
 *
 * ```typescript
 * import { AeicoElement, html, render } from 'aeico'
 * import { t, locale } from 'aeico'
 * ```
 */

export { AeicoBase, AeicoElement } from 'aeico-element';
export type { AeicoBaseProps, AeicoElementProps } from 'aeico-element';

export { getCurrentContext } from 'aeico-element';
export type { Updatable } from 'aeico-element';

export { styleStore, StyleResult, supportAdoptStyle } from 'aeico-element';
export type { StyleEntry, StyleItem, StyleItems, StyleOptions, StyleScope } from 'aeico-element';

export type {
  PropertyType,
  Prop,
  Props,
  InferProps,
  WatcherHandler,
  Watchers,
} from 'aeico-element';

export { prop, PROP_METADATA_KEY } from 'aeico-element';

export { Reconciler, html, render, getReconciler, tags } from 'aeico-view';
export type { TagProps, Renderable, Tags } from 'aeico-view';
