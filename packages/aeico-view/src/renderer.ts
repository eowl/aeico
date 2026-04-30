import ElementBuilder from './element-builder';

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

class Renderer {
  private readonly _builderCache = new WeakMap<Node, ElementBuilder>();
  private _activeBuilder: ElementBuilder | null = null;

  /**
   * Proxy that delegates all property access to the currently active builder.
   *
   * Lets you destructure tag helpers without explicitly calling `getActiveBuilder()`:
   *
   * ```ts
   * const { div, span, button } = tags
   * ```
   *
   * Must be used inside a `render()` / `html()` context, same as `getActiveBuilder()`.
   */
  readonly tags: ElementBuilder = new Proxy({} as ElementBuilder, {
    get: (_t, prop) => Reflect.get(this.getActiveBuilder(), prop),
  });

  /**
   * Return the `ElementBuilder` that is currently executing inside a
   * `render()` call.  Useful for helper methods that need builder access
   * without receiving it as a parameter.
   *
   * Throws if called outside a `render()` execution context.
   */
  getActiveBuilder = (): ElementBuilder => {
    if (!this._activeBuilder) {
      throw new Error('getActiveBuilder() called outside of a render() context.');
    }

    return this._activeBuilder;
  };

  /**
   * Create a render structure
   * html is a DSL function, is not a template literal tag
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
  html = (cb: (builder: ElementBuilder) => void): RenderResult => {
    return new RenderResult(cb);
  };

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
  render = (result: RenderResult, root: Node): void => {
    let builder = this._builderCache.get(root);

    if (!builder) {
      builder = new ElementBuilder();
      this._builderCache.set(root, builder);
    }

    const prev = this._activeBuilder;
    this._activeBuilder = builder;

    try {
      builder.build(root, () => result._cb(builder));
    } finally {
      this._activeBuilder = prev;
    }
  };
}

export const { html, render, getActiveBuilder, tags } = new Renderer();
