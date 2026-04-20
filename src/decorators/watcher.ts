import type { WatcherHandler } from '../core/types'

// Polyfill Symbol.metadata for runtimes that don't support it yet
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
 * @watcher('disabled')
 * onDisabledChanged(newValue: boolean, oldValue: boolean) { ... }
 *
 * @watcher('min', 'max')
 * onRangeChanged(newValue: unknown, oldValue: unknown) { ... }
 * ```
 */
export function watcher(...propNames: string[]) {
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
