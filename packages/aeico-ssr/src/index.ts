/**
 * aeico-ssr - Server-side rendering utilities for Aeico components.
 *
 * All exports are safe to use in Node.js, Edge Runtime, or at build time (SSG/SSR).
 * No DOM API is required.
 *
 * @example Render an `html()` template to a string
 * ```typescript
 * import { html } from 'aeico-view'
 * import { renderHtml } from 'aeico-ssr'
 *
 * const result = html(({ div, span }) => {
 *   div({ className: 'card' }, () => {
 *     span({ textContent: 'Hello SSR' })
 *   })
 * })
 * renderHtml(result) // '<div class="card"><span>Hello SSR</span></div>'
 * ```
 *
 * @example Render a full component (with DSR for hydration)
 * ```typescript
 * import { renderToString } from 'aeico-ssr'
 * import { MyCounter } from './my-counter'
 *
 * renderToString(MyCounter, { count: 5 })
 * // '<my-counter count="5"><template shadowrootmode="open">...</template></my-counter>'
 * ```
 */
export { renderHtml } from './render-html';
export { renderToString } from './render-component';
export { HtmlSerializer } from './html-serializer';
