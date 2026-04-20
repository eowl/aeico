import type { ComputedPropertyConfig } from '../core/types'

// Polyfill Symbol.metadata for runtimes that don't support it yet
;(Symbol as any).metadata ??= Symbol.for('Symbol.metadata')

export const COMPUTED_METADATA_KEY = Symbol('aeico:computed')

type ComputedMetadata = Record<string, ComputedPropertyConfig>

/**
 * Decorator for declaring cached computed properties on Aeico components.
 *
 * Applied to a getter method, the return value is automatically cached and
 * only recomputed when one of the declared dependencies changes.
 *
 * @param deps One or more reactive property names this getter depends on.
 *
 * @example
 * ```typescript
 * @computed('price', 'qty')
 * get total() {
 *   return this.price * this.qty
 * }
 * ```
 */
export function computed(...deps: string[]) {
  return function <This, Value>(
    target: () => Value,
    context: ClassGetterDecoratorContext<This, Value>,
  ): void {
    const propName = String(context.name)
    const meta = context.metadata as Record<symbol, ComputedMetadata>

    if (!Object.hasOwn(meta, COMPUTED_METADATA_KEY)) {
      meta[COMPUTED_METADATA_KEY] = Object.create(null) as ComputedMetadata
    }

    meta[COMPUTED_METADATA_KEY][propName] = {
      deps,
      compute: (self: any) => target.call(self),
    }
  }
}
