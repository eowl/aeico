import Reconciler from './reconciler';
/**
 * RenderResult - opaque wrapper produced by `html()`.
 *
 * Holds the render callback that will be executed when `render()` applies
 * the template to a DOM root.  This object is intentionally opaque to
 * consumers - just pass it to `render(result, root)`.
 */
export declare class RenderResult {
  readonly _cb: (reconciler: Reconciler) => void;
  /** @internal */
  constructor(_cb: (reconciler: Reconciler) => void);
}
export declare const html: (cb: (reconciler: Reconciler) => void) => RenderResult,
  render: (result: RenderResult, root: Node) => void,
  getReconciler: () => Reconciler,
  tags: Reconciler;
