import Reconciler from './reconciler';

/**
 * RenderResult — opaque wrapper produced by `html()`.
 *
 * Holds the render callback that will be executed when `render()` applies
 * the template to a DOM root.  This object is intentionally opaque to
 * consumers — just pass it to `render(result, root)`.
 */
export class RenderResult {
  /** @internal */
  constructor(readonly _cb: (reconciler: Reconciler) => void) {}
}

class Renderer {
  private readonly _reconcilerCache = new WeakMap<Node, Reconciler>();
  private _activeReconciler: Reconciler | null = null;

  /**
   * Proxy that delegates all property access to the currently active builder.
   *
   * Lets you destructure tag helpers without explicitly calling `getReconciler()`:
   *
   * ```ts
   * const { div, span, button } = tags
   * ```
   *
   * Must be used inside a `render()` / `html()` context, same as `getReconciler()`.
   */
  readonly tags: Reconciler = new Proxy({} as Reconciler, {
    get: (_t, prop) => Reflect.get(this.getReconciler(), prop),
  });

  /**
   * Return the `Reconciler` that is currently executing inside a
   * `render()` call.  Useful for helper methods that need builder access
   * without receiving it as a parameter.
   *
   * Throws if called outside a `render()` execution context.
   */
  getReconciler = (): Reconciler => {
    if (!this._activeReconciler) {
      throw new Error('getReconciler() called outside of a render() context.');
    }

    return this._activeReconciler;
  };

  /**
   * Create a render structure
   * html is a DSL function, is not a template literal tag
   *
   * The callback receives a `Reconciler` whose tag helpers
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
  html = (cb: (reconciler: Reconciler) => void): RenderResult => {
    return new RenderResult(cb);
  };

  /**
   * Apply a `RenderResult` (produced by `html()`) to a DOM root node.
   *
   * A dedicated `Reconciler` instance is cached per root, so repeated
   * calls to `render(…, root)` reuse the same builder and benefit from
   * its DOM-diffing.
   *
   * ```ts
   * render(html(({ div }) => { div({ text: 'hi' }) }), document.body)
   * ```
   */
  render = (result: RenderResult, root: Node): void => {
    let reconciler = this._reconcilerCache.get(root);

    if (!reconciler) {
      reconciler = new Reconciler();
      this._reconcilerCache.set(root, reconciler);
    }

    const prev = this._activeReconciler;
    this._activeReconciler = reconciler;

    try {
      reconciler.build(root, () => result._cb(reconciler));
    } finally {
      this._activeReconciler = prev;
    }
  };
}

export const { html, render, getReconciler, tags } = new Renderer();

/**
 * @internal — Returns the render callback stored inside a {@link RenderResult}.
 *
 * Used by `aeico-ssr` to execute the callback against a non-DOM serializer
 * implementation without accessing the private `_cb` field directly.
 */
export function getCallback(r: RenderResult): (reconciler: Reconciler) => void {
  return r._cb;
}
