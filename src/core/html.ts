import ElementBuilder from './element-builder'

/**
 * RenderResult — opaque wrapper produced by `html()`.
 *
 * Holds the render callback that will be executed when `render()` applies
 * the template to a DOM root.  This object is intentionally opaque to
 * consumers — just pass it to `render(result, root)`.
 */
export class RenderResult {
  /** @internal */
  constructor(readonly _cb: (builder: ElementBuilder) => void) {}
}

const _builderCache = new WeakMap<Node, ElementBuilder>()

let _activeBuilder: ElementBuilder | null = null

/**
 * Return the `ElementBuilder` that is currently executing inside a
 * `render()` call.  Useful for helper methods that need builder access
 * without receiving it as a parameter.
 *
 * Throws if called outside a `render()` execution context.
 */
export function getActiveBuilder(): ElementBuilder {
  if (!_activeBuilder) {
    throw new Error('getActiveBuilder() called outside of a render() context.')
  }

  return _activeBuilder
}

/**
 * Create a render template.
 *
 * The callback receives an `ElementBuilder` whose tag helpers
 * (`div`, `span`, …) can be destructured for convenience.
 *
 * ```ts
 * const tpl = html(({ div, span }) => {
 *   div({ className: 'box' }, () => {
 *     span({ text: 'hello' })
 *   })
 * })
 * ```
 *
 * The callback is **not** executed immediately — it is deferred until
 * `render(tpl, root)` is called.
 */
export function html(cb: (builder: ElementBuilder) => void): RenderResult {
  return new RenderResult(cb)
}

/**
 * Apply a `RenderResult` (produced by `html()`) to a DOM root node.
 *
 * A dedicated `ElementBuilder` instance is cached per root, so repeated
 * calls to `render(…, root)` reuse the same builder and benefit from
 * its DOM-diffing.
 *
 * ```ts
 * render(html(({ div }) => { div({ text: 'hi' }) }), document.body)
 * ```
 */
export function render(result: RenderResult, root: Node): void {
  let builder = _builderCache.get(root)

  if (!builder) {
    builder = new ElementBuilder()
    _builderCache.set(root, builder)
  }

  const prev = _activeBuilder
  _activeBuilder = builder

  try {
    builder.build(root, () => result._cb(builder!))
  } finally {
    _activeBuilder = prev
  }
}
