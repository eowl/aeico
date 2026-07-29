import type { TagProps } from 'aeico-view';

// HTML5 void elements - they have no closing tag and cannot have children.
const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

// HTML5 raw text elements and escapable raw text elements - their text content
// is not parsed as HTML, so entity escaping (&amp; &lt; &gt;) must not be applied.
const RAW_TEXT_ELEMENTS = new Set(['script', 'style', 'textarea', 'title']);

/** Escapes `&` and `"` for safe use inside a double-quoted HTML attribute value. */
function escapeAttr(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

/** Escapes `&`, `<`, and `>` for safe use as HTML text content. */
function escapeText(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Converts a camelCase identifier to kebab-case (e.g. `myWidget` yields `my-widget`). */
function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

/**
 * Resolves a `className` / `class` prop value to a space-separated class string.
 *
 * Accepts a plain string (returned as-is) or an object map where truthy keys
 * become class names: `{ active: true, hidden: false }` produces `'active'`.
 */
function serializeClass(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value as Record<string, boolean>)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(' ');
  }
  return '';
}

/**
 * Serializes a style object to an inline CSS declaration string.
 *
 * camelCase property names are converted to kebab-case; CSS custom properties
 * (`--foo`) are kept verbatim.  Example: `{ color: 'red', '--x': '1' }` produces `'color:red;--x:1'`.
 */
function serializeStyle(style: Record<string, string>): string {
  return Object.entries(style)
    .map(([k, v]) => {
      const prop = k.startsWith('--') ? k : camelToKebab(k);
      return `${prop}:${v}`;
    })
    .join(';');
}

/**
 * Converts a `TagProps` bag to an HTML attribute string (with a leading space).
 *
 * Serialization rules:
 * - `text` / `textContent` - rendering hints, not emitted as attributes
 * - `@…` event handlers - client-only, stripped entirely
 * - `key` becomes `data-key="…"`
 * - `className` / `class` - resolved via {@link serializeClass}
 * - `style` object - serialized via {@link serializeStyle}
 * - `true` boolean - presence-only attribute (e.g. `disabled`)
 * - `false` / `null` / `undefined` - attribute omitted
 * - Complex object props - skipped; will be set by the client on upgrade
 * - Everything else - `key="String(value)"`
 */
function serializeAttrs(props: TagProps): string {
  let s = '';

  for (const [key, value] of Object.entries(props)) {
    // Pure rendering hints - not emitted as attributes.
    if (key === 'text' || key === 'textContent' || key === 'innerHTML') continue;
    // Events are client-only; skip entirely.
    if (key.startsWith('@')) continue;
    if (value == null || value === false) continue;

    if (key === 'key') {
      s += ` data-key="${escapeAttr(String(value))}"`;
    } else if (key === 'className' || key === 'class') {
      const cls = serializeClass(value);
      if (cls) s += ` class="${escapeAttr(cls)}"`;
    } else if (key === 'style') {
      if (typeof value === 'object') {
        const styleStr = serializeStyle(value as Record<string, string>);
        if (styleStr) s += ` style="${escapeAttr(styleStr)}"`;
      }
    } else if (value === true) {
      // Boolean attribute - presence only (e.g. `disabled`, `checked`).
      s += ` ${key}`;
    } else if (typeof value === 'object') {
      // Complex object props (arrays, DOM refs) cannot be serialized as attributes.
      // Skip silently; they will be set by the client on upgrade/hydration.
      continue;
    } else {
      s += ` ${key}="${escapeAttr(String(value))}"`;
    }
  }

  return s;
}

/**
 * Server-side HTML string builder that structurally mirrors the `Reconciler` API.
 *
 * Executes any `RenderResult` callback (`html(() => { … })`) in Node.js or an
 * Edge Runtime without touching the DOM.  The constructor returns a `Proxy` so
 * that arbitrary camelCase property accesses (e.g. `s.myWidget`) are intercepted
 * and serialized as kebab-case HTML elements (`<my-widget>`), matching the
 * client-side `Reconciler` behaviour.
 *
 * ```ts
 * const s = new HtmlSerializer();
 * s.div({ className: 'box' }, () => { s.span({ text: 'hello' }); });
 * s.toString(); // '<div class="box"><span>hello</span></div>'
 * ```
 *
 * Retrieve accumulated markup with {@link toString}; call {@link reset} to clear
 * the buffer and reuse the instance.
 */
class HtmlSerializer {
  private _parts: string[] = [];

  constructor() {
    // Wrap in a Proxy so that property accesses not already defined on the
    // instance (e.g. `reconciler.myWidget`) are treated as tag calls and
    // dispatched to `_create` with the kebab-cased element name.
    return new Proxy(this, {
      get(target, prop: string) {
        if (typeof prop !== 'string' || prop in target) {
          return Reflect.get(target, prop) as unknown;
        }

        const tagName = /[A-Z]/.test(prop) ? camelToKebab(prop) : prop;

        return (p?: TagProps | (() => void), cb?: () => void) => {
          if (typeof p === 'function') return target._create(tagName, undefined, p);

          return target._create(tagName, p, cb);
        };
      },
    });
  }

  private _create(tagName: string, props?: TagProps, cb?: () => void): void {
    const attrsStr = props ? serializeAttrs(props) : '';

    if (VOID_ELEMENTS.has(tagName)) {
      this._parts.push(`<${tagName}${attrsStr}>`);
      return;
    }

    this._parts.push(`<${tagName}${attrsStr}>`);

    if (cb) {
      // When a children callback is provided, it owns all inner content;
      // `text`/`textContent` props on the same element are intentionally ignored,
      // matching the client-side Reconciler behaviour.
      cb();
    } else if (props) {
      const t = props.text ?? props.textContent;
      if (t != null) {
        this._parts.push(RAW_TEXT_ELEMENTS.has(tagName) ? String(t) : escapeText(String(t)));
      }
      if (props.innerHTML != null) {
        this._parts.push(String(props.innerHTML));
      }
    }

    this._parts.push(`</${tagName}>`);
  }

  /**
   * Dynamic-tag entry point - equivalent to the Proxy shorthand for statically known tags.
   *
   * Supports the same `(props?, children?)` / `(children)` overloads.
   */
  el = (tagName: string, propsOrCb?: TagProps | (() => void), cb?: () => void): unknown => {
    const props = typeof propsOrCb === 'function' ? undefined : propsOrCb;
    const callback = typeof propsOrCb === 'function' ? propsOrCb : cb;
    this._create(tagName, props, callback);

    return undefined;
  };

  /** Appends an HTML-escaped text node to the accumulated output. */
  text = (content: string): unknown => {
    this._parts.push(escapeText(content));

    return undefined;
  };

  /**
   * Client-only - inserts a pre-existing DOM node into the render tree.
   * No-op in SSR; the node will be hydrated on the client after upgrade.
   */
  node = (_existingNode: unknown): unknown => undefined;

  /** Runs `cb` inline without wrapping output in a tag; mirrors `Reconciler.fragment`. */
  fragment = (cb: () => void): unknown => {
    cb();

    return undefined;
  };

  /**
   * On the client, `detached()` suspends the active render context to prevent
   * cursor interference during out-of-order subtree construction.  In SSR there
   * is no stateful render context, so `fn` is executed directly.
   */
  detached = <T>(fn: () => T): T => fn();

  /** Returns the accumulated HTML string. */
  toString(): string {
    return this._parts.join('');
  }

  /** Clears the accumulated output so the instance can be reused. */
  reset(): void {
    this._parts = [];
  }
}

export { HtmlSerializer };
export { serializeAttrs, serializeClass, serializeStyle, escapeAttr, escapeText };
