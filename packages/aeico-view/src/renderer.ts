import Reconciler, { type Tags } from './reconciler';

/**
 * Renderable - opaque wrapper produced by `html()`.
 *
 * Holds the render callback that will be executed when `render()` applies
 * the template to a DOM root.  This object is intentionally opaque to
 * consumers - just pass it to `render(renderable, root)`.
 */
export class Renderable {
  /** @internal */
  constructor(readonly _cb: (tags: Tags) => void) {}
}

class Renderer {
  private readonly _reconcilerCache = new WeakMap<Node, Reconciler>();
  private _activeReconciler: Reconciler | null = null;

  /**
   * Proxy that exposes the {@link Tags} view of the currently active
   * {@link Reconciler}.
   *
   * Lets you destructure tag helpers without explicitly calling `getReconciler()`:
   *
   * ```ts
   * const { div, span, button } = tags
   * ```
   *
   * Must be used inside a `render()` / `html()` context, same as `getReconciler()`.
   */
  readonly tags: Tags = new Proxy({} as Tags, {
    get: (_t, prop) => Reflect.get(this.getReconciler(), prop),
  });

  /**
   * Return the {@link Reconciler} that is currently executing inside a
   * `render()` call.  Useful for helper methods that need engine-level
   * access (e.g. `detached()`) without receiving it as a parameter.
   *
   * Unlike the {@link tags} proxy, this returns the full engine - use `tags`
   * instead when only the tag helpers are needed.
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
   * Declare a render structure as a reusable {@link Renderable}.
   *
   * `html` is a **callback DSL**, not a tagged template literal. The callback
   * receives the active {@link Tags} view whose tag helpers (`div`, `span`, …)
   * can be destructured. The callback is **not** executed immediately - it is
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
   *     // Event handlers via the '@event' syntax (addEventListener).
   *     // value without the '@' prefix falls through to setAttribute and is
   *     // stringified.  Always use '@' + the DOM event name (e.g. '@click').
   *     button({ '@click': () => doSomething(), textContent: 'Click me' })
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
   * @param cb - Tags callback that describes the desired DOM tree.
   * @returns An opaque {@link Renderable} to pass to {@link render}.
   */
  html = (cb: (tags: Tags) => void): Renderable => {
    return new Renderable(cb);
  };

  /**
   * Apply a {@link Renderable} (produced by {@link html}) to a DOM root node.
   *
   * A `Reconciler` instance is cached per root, so repeated calls with the
   * same root reuse the same instance and only patch nodes that changed
   * (cursor-based diffing - no virtual DOM).
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
   *       button({ '@click': () => render(app(count - 1), root), textContent: '-' })
   *       span({ textContent: String(count) })
   *       button({ '@click': () => render(app(count + 1), root), textContent: '+' })
   *     })
   *   })
   *
   * const root = document.getElementById('app')!
   * render(app(0), root)
   * ```
   *
   * @param renderable - The {@link Renderable} to apply.
   * @param root   - Target DOM node (shadow root, element, or `document.body`).
   */
  render = (renderable: Renderable, root: Node): void => {
    let reconciler = this._reconcilerCache.get(root);

    if (!reconciler) {
      reconciler = new Reconciler();
      this._reconcilerCache.set(root, reconciler);
    }

    const prev = this._activeReconciler;
    this._activeReconciler = reconciler;

    try {
      reconciler.build(root, () => renderable._cb(reconciler));
    } finally {
      this._activeReconciler = prev;
    }
  };
}

export const { html, render, getReconciler, tags } = new Renderer();

/**
 * @internal - Returns the render callback stored inside a {@link Renderable}.
 *
 * Used by `aeico-ssr` to execute the callback against a non-DOM serializer
 * implementation without accessing the private `_cb` field directly.
 */
export function getCallback(r: Renderable): (tags: Tags) => void {
  return r._cb;
}
