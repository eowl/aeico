import type { Prop } from '../core/types'

// Polyfill Symbol.metadata for runtimes that don't support it yet
;(Symbol as any).metadata ??= Symbol.for('Symbol.metadata')

export const PROP_METADATA_KEY = Symbol('aeico:props')

type PropMetadata = Record<string | symbol, Prop>

function applyProp(options: Prop, context: ClassAccessorDecoratorContext): void {
  const propName = String(context.name)
  const meta = context.metadata as Record<symbol, PropMetadata>

  if (!Object.hasOwn(meta, PROP_METADATA_KEY)) {
    meta[PROP_METADATA_KEY] = Object.create(null) as PropMetadata
  }

  meta[PROP_METADATA_KEY][propName] = options
}

/**
 * Decorator for defining reactive properties on Aeico components.
 *
 * Supports three calling patterns:
 * - `@prop accessor name: string`           — bare, no options
 * - `@prop() accessor name: string`         — empty factory
 * - `@prop({ type: String }) accessor name`  — with options
 *
 * Requires the `accessor` keyword (TC39 auto-accessor).
 */
export function prop<This, Value>(
  target: ClassAccessorDecoratorTarget<This, Value>,
  context: ClassAccessorDecoratorContext<This, Value>,
): void

export function prop(options?: Prop): <This, Value>(
  target: ClassAccessorDecoratorTarget<This, Value>,
  context: ClassAccessorDecoratorContext<This, Value>,
) => void

export function prop<This, Value>(
  targetOrOptions?: ClassAccessorDecoratorTarget<This, Value> | Prop,
  context?: ClassAccessorDecoratorContext<This, Value>,
): void | (<T, V>(
  target: ClassAccessorDecoratorTarget<T, V>,
  context: ClassAccessorDecoratorContext<T, V>,
) => void) {
  // Bare usage: @prop accessor foo
  if (context !== undefined && context.kind === 'accessor') {
    applyProp({}, context)

    return
  }

  // Factory usage: @prop() or @prop({ type: String })
  const options = (targetOrOptions ?? {}) as Prop

  return (_target, ctx) => {
    applyProp(options, ctx)
  }
}
