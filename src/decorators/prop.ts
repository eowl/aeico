import type { Prop } from '../core/types'

// Polyfill Symbol.metadata for runtimes that don't support it yet
// [TC39 Stage 3 Decorators] Symbol.metadata is the per-class metadata store defined by the Decorators proposal
;(Symbol as any).metadata ??= Symbol.for('Symbol.metadata')

export const PROP_METADATA_KEY = Symbol('aeico:props')

/** @internal Names of props declared via `accessor` keyword — collected per-class and merged up the inheritance chain. */
export const ACCESSOR_PROPS_KEY = Symbol('aeico:accessor-props')

type PropMetadata = Record<string | symbol, Prop>

type PropDecoratorContext<This = unknown, Value = unknown> =
  | ClassAccessorDecoratorContext<This, Value>
  | ClassFieldDecoratorContext<This, Value>

type PropDecorator =
  & (<This, Value>(
    target: ClassAccessorDecoratorTarget<This, Value>,
    context: ClassAccessorDecoratorContext<This, Value>,
  ) => ClassAccessorDecoratorResult<This, Value>)
  & (<This, Value>(
    target: undefined,
    context: ClassFieldDecoratorContext<This, Value>,
  ) => void)

function applyProp(options: Prop, context: PropDecoratorContext): ClassAccessorDecoratorResult<unknown, unknown> | void {
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
    // [TC39 Stage 3 Decorators] addInitializer callbacks run after TC39 Class Fields initializers,
    // so this restores the reactive accessor after esbuild's __publicField overwrite.
    context.addInitializer(function (this: unknown) {
      ;(this as any)._reclaimProp?.(propName)
    })

    return
  }

  // For accessor declarations, mark the prop as `wrapped` in static metadata so that
  // executeUpdate() can reflect its inline default value on first render.
  //
  // Execution order:
  //   super() → _initializeProps() installs reactive getter/setter on the instance
  //   → init(value) writes value to _propName (our backing field, not TC39's)
  //   → constructor returns
  //   → executeUpdate() (microtask, first render): iterates all accessor props,
  //      reads _propName, reflects to attribute if no HTML attr already exists
  //
  // The `init` only writes to the agreed-upon backing field (_propName) — all scheduling
  // logic lives in BaseElement via the ACCESSOR_PROPS_KEY metadata set, not in the decorator.
  meta[PROP_METADATA_KEY][propName] = options
  if (!Object.hasOwn(meta, ACCESSOR_PROPS_KEY)) {
    ;(meta as Record<symbol, unknown>)[ACCESSOR_PROPS_KEY] = new Set<string>()
  }
  ;((meta as Record<symbol, unknown>)[ACCESSOR_PROPS_KEY] as Set<string>).add(propName)
  return {
    init(this: unknown, value: unknown) {
      if (value !== undefined) {
        // Redirect the inline default from the TC39 backing field to our _propName field
        // so the reactive getter can find it. setAttribute() is not called here because
        // init runs synchronously inside the constructor body (spec violation).
        ;(this as Record<string, unknown>)[`_${propName}`] = value
      }
      return value as unknown
    },
  } as ClassAccessorDecoratorResult<unknown, unknown>
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
): ClassAccessorDecoratorResult<This, Value>

export function prop<This, Value>(
  target: undefined,
  context: ClassFieldDecoratorContext<This, Value>,
): void

export function prop(options?: Prop): PropDecorator

export function prop<This, Value>(
  targetOrOptions?: ClassAccessorDecoratorTarget<This, Value> | Prop | undefined,
  context?: PropDecoratorContext<This, Value>,
): ClassAccessorDecoratorResult<unknown, unknown> | void | PropDecorator {
  // Bare usage: @prop foo / @prop accessor foo
  if (context !== undefined && (context.kind === 'field' || context.kind === 'accessor')) {
    return applyProp({}, context)
  }

  // Factory usage: @prop() or @prop({ type: String })
  const options = (targetOrOptions ?? {}) as Prop

  return ((_target, ctx) => {
    return applyProp(options, ctx)
  }) as PropDecorator
}
