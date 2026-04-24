import type { Prop } from '../core/types'

// Polyfill Symbol.metadata for runtimes that don't support it yet
;(Symbol as any).metadata ??= Symbol.for('Symbol.metadata')

export const PROP_METADATA_KEY = Symbol('aeico:props')

type PropMetadata = Record<string | symbol, Prop>

type PropDecoratorContext<This = unknown, Value = unknown> =
  | ClassAccessorDecoratorContext<This, Value>
  | ClassFieldDecoratorContext<This, Value>

type PropDecorator =
  & (<This, Value>(
    target: ClassAccessorDecoratorTarget<This, Value>,
    context: ClassAccessorDecoratorContext<This, Value>,
  ) => void)
  & (<This, Value>(
    target: undefined,
    context: ClassFieldDecoratorContext<This, Value>,
  ) => void)

function applyProp(options: Prop, context: PropDecoratorContext): void {
  const propName = String(context.name)
  const meta = context.metadata as Record<symbol, PropMetadata>

  if (!Object.hasOwn(meta, PROP_METADATA_KEY)) {
    meta[PROP_METADATA_KEY] = Object.create(null) as PropMetadata
  }

  meta[PROP_METADATA_KEY][propName] = options

  // For class field declarations (not `accessor`), esbuild lowers the decorator into a
  // `__publicField(this, propName, ...)` call that runs *after* `super()` returns.  This
  // overwrites the reactive getter/setter that `_initializeProps()` defined on the instance.
  // `addInitializer` callbacks run after the field initializer, so we use one to restore
  // the reactive accessor before the first update cycle executes.
  if (context.kind === 'field') {
    context.addInitializer(function (this: unknown) {
      ;(this as any)._reclaimProp?.(propName)
    })
  }
}

/**
 * Decorator for defining reactive properties on Aeico components.
 *
 * Supports both class field and class auto-accessor declarations.
 *
 * Field usage (no `accessor`):
 * - `@prop label?: string`
 * - `@prop() name?: string`
 * - `@prop({ type: String }) title?: string`
 *
 * Auto-accessor usage (with `accessor`):
 * - `@prop accessor label: string | undefined`
 * - `@prop() accessor name: string | undefined`
 * - `@prop({ type: String }) accessor title: string | undefined`
 *
 * Note: `accessor` declarations cannot use `?` optional syntax in TypeScript.
 * Use `T | undefined` instead.
 */
export function prop<This, Value>(
  target: ClassAccessorDecoratorTarget<This, Value>,
  context: ClassAccessorDecoratorContext<This, Value>,
): void

export function prop<This, Value>(
  target: undefined,
  context: ClassFieldDecoratorContext<This, Value>,
): void

export function prop(options?: Prop): PropDecorator

export function prop<This, Value>(
  targetOrOptions?: ClassAccessorDecoratorTarget<This, Value> | Prop | undefined,
  context?: PropDecoratorContext<This, Value>,
): void | PropDecorator {
  // Bare usage: @prop foo / @prop accessor foo
  if (context !== undefined && (context.kind === 'field' || context.kind === 'accessor')) {
    applyProp({}, context)

    return
  }

  // Factory usage: @prop() or @prop({ type: String })
  const options = (targetOrOptions ?? {}) as Prop

  return ((_target, ctx) => {
    applyProp(options, ctx)
  }) as PropDecorator
}
