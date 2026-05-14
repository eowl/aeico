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
   * Declare a render structure as a reusable `RenderResult`.
   *
   * `html` is a **callback DSL**, not a tagged template literal. The callback
   * receives the active {@link Reconciler} whose tag helpers (`div`, `span`, …)
   * can be destructured. The callback is **not** executed immediately — it is
   * deferred until {@link render} applies it to a DOM root.
   *
   * **Prop syntax cheat-sheet:**
   * ```typescript
   * html(({ div, button, input, svg, circle }) => {
   *   // Static string class
   *   div({ className: 'card' }, () => {
   *
   *     // Conditional class map: keys whose value is true are included
   *     div({ className: { active: isActive, disabled: isDisabled } })
   *
   *     // Text content shorthand
   *     div({ textContent: label })
   *
   *     // Inline styles as a camelCase object
   *     div({ style: { color: 'red', fontSize: '14px' } })
   *
   *     // Native event handlers (direct assignment)
   *     button({ onclick: () => doSomething(), textContent: 'Click me' })
   *
   *     // Any HTML attribute (pass-through)
   *     input({ type: 'number', min: '0', max: '100', value: String(val) })
   *
   *     // SVG works too
   *     svg({ viewBox: '0 0 24 24' }, () => {
   *       circle({ cx: '12', cy: '12', r: '10' })
   *     })
   *   })
   * })
   * ```
   *
   * @param cb - Builder callback that describes the desired DOM tree.
   * @returns An opaque {@link RenderResult} to pass to {@link render}.
   */
  html = (cb: (reconciler: Reconciler) => void): RenderResult => {
    return new RenderResult(cb);
  };

  /**
   * Apply a `RenderResult` (produced by {@link html}) to a DOM root node.
   *
   * A `Reconciler` instance is cached per root, so repeated calls with the
   * same root reuse the same instance and only patch nodes that changed
   * (cursor-based diffing — no virtual DOM).
   *
   * Typically called inside an Aeico component's `render()` method, but can
   * also be used standalone to drive any DOM node:
   *
   * ```typescript
   * import { html, render } from 'aeico-view'
   *
   * const app = (count: number) =>
   *   html(({ div, button, span }) => {
   *     div({}, () => {
   *       button({ onclick: () => render(app(count - 1), root), textContent: '-' })
   *       span({ textContent: String(count) })
   *       button({ onclick: () => render(app(count + 1), root), textContent: '+' })
   *     })
   *   })
   *
   * const root = document.getElementById('app')!
   * render(app(0), root)
   * ```
   *
   * @param result - The `RenderResult` to apply.
   * @param root   - Target DOM node (shadow root, element, or `document.body`).
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
