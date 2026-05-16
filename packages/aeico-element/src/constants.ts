/**
 * Lightweight re-export of decorator metadata symbol constants.
 *
 * This entry point intentionally does **not** import `AeicoBase` or `AeicoElement`
 * so that SSR code (e.g. `aeico-ssr`) can access the keys without requiring a
 * `HTMLElement` shim to be loaded first.
 *
 * @example
 * ```ts
 * import { PROP_METADATA_KEY, COMPUTED_METADATA_KEY } from 'aeico-element/constants';
 * ```
 */
export { PROP_METADATA_KEY, ACCESSOR_PROPS_KEY } from './decorators/prop';
export { COMPUTED_METADATA_KEY } from './decorators/computed';
export { WATCHER_METADATA_KEY } from './decorators/watch';
