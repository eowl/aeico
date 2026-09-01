import { getCallback, type Renderable } from 'aeico-view';
import { HtmlSerializer } from './html-serializer';

/**
 * Serialize a `Renderable` (produced by `html()`) to an HTML string.
 *
 * Runs entirely in the current environment without any DOM API dependency -
 * safe to call in Node.js, Edge Runtime, or at build time (SSG).
 *
 * ```ts
 * import { html } from 'aeico-view';
 * import { renderHtml } from 'aeico-ssr';
 *
 * const template = html(({ div, span }) => {
 *   div({ className: 'box' }, () => {
 *     span({ text: 'Hello SSR' });
 *   });
 * });
 *
 * renderHtml(template); // '<div class="box"><span>Hello SSR</span></div>'
 * ```
 *
 * @param renderable - The `Renderable` to serialize.
 * @returns The rendered HTML fragment as a string.
 */
export function renderHtml(renderable: Renderable): string {
  const serializer = new HtmlSerializer();
  const cb = getCallback(renderable);
  // HtmlSerializer mirrors the Reconciler API via a Proxy but is typed
  // separately to avoid DOM dependencies.  The cast bridges the structural
  // gap so the render callback (typed as `(reconciler: Reconciler) => void`)
  // can be driven by the SSR serializer in a Node.js / Edge Runtime context.
  cb(serializer as unknown as Parameters<typeof cb>[0]);

  return serializer.toString();
}
