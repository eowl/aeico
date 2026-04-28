import type { WatcherHandler } from '../core/types'

// Polyfill Symbol.metadata for runtimes that don't support it yet
// [TC39 Stage 3 Decorators] Symbol.metadata is the per-class metadata store defined by the Decorators proposal
;(Symbol as any).metadata ??= Symbol.for('Symbol.metadata')

export const WATCHER_METADATA_KEY = Symbol('aeico:watchers')

type WatcherMetadata = Record<string, WatcherHandler>

/**
 * Decorator for declaring property watchers on Aeico component methods.
 *
 * Associates one or more reactive property names with the decorated method.
 * The method is called with `(newValue, oldValue)` whenever any of the
 * specified properties change.
 *
 * @param propNames One or more property names to watch.
 *
 * @example
 * ```typescript
 * @watch('disabled')
 * onDisabledChanged(newValue: boolean, oldValue: boolean) { ... }
 *
 * @watch('min', 'max')
 * onRangeChanged(newValue: unknown, oldValue: unknown) { ... }
 * ```
 */
export function watch(...propNames: string[]) {
  return function <This, Value extends (newValue: unknown, oldValue: unknown) => void>(
    _target: Value,
    context: ClassMethodDecoratorContext<This, Value>,
  ): void {
    const methodName = String(context.name)
    const meta = context.metadata as Record<symbol, WatcherMetadata>

    if (!Object.hasOwn(meta, WATCHER_METADATA_KEY)) {
      meta[WATCHER_METADATA_KEY] = Object.create(null) as WatcherMetadata
    }

    for (const propName of propNames) {
      meta[WATCHER_METADATA_KEY][propName] = methodName
    }
  }
}
