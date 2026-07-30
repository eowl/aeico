import { getCallback, type RenderResult } from 'aeico-view';
import type { Props, Prop, Computed, StyleEntry } from 'aeico-element';
import { PROP_METADATA_KEY, COMPUTED_METADATA_KEY } from 'aeico-element/constants';
import { HtmlSerializer, escapeAttr } from './html-serializer';

/** Converts a PascalCase or camelCase class name to a kebab-case custom element tag name. */
function toKebab(str: string): string {
  return str.replace(/([A-Z])/g, (_, c: string) => `-${c.toLowerCase()}`).replace(/^-/, '');
}

/**
 * Coerces a raw prop value to the type declared in `static props` before it is
 * assigned to the render context.  `Array` and `Object` types accept either an
 * already-typed value or a JSON-encoded string.
 */
function coercePropValue(value: unknown, type: NonNullable<Prop['type']>): unknown {
  if (type === Number) return Number(value);
  if (type === Boolean) return value === true || value === '' || value === 'true';
  if (type === String) return String(value);
  if (type === Array) {
    return Array.isArray(value) ? value : JSON.parse(String(value));
  }
  if (type === Object) {
    return typeof value === 'object' && value !== null ? value : JSON.parse(String(value));
  }

  return value;
}

/**
 * Recursively flattens a `StyleEntry` tree to a single CSS string.
 *
 * - `string` - returned as-is
 * - array - items joined with newlines
 * - object with `cssText` - extracts the `cssText` property (covers `StyleResult`)
 * - `CSSStyleSheet` instances (browser-only) - skipped; cannot be serialized in SSR
 */
function flattenStyleItems(entry: StyleEntry): string {
  if (typeof entry === 'string') return entry;
  if (Array.isArray(entry)) {
    return entry.map((e) => flattenStyleItems(e as StyleEntry)).join('\n');
  }
  // StyleResult (has cssText) - covers both StyleResult and any cssText-shaped object.
  // Raw CSSStyleSheet instances (browser-only) cannot be serialized in SSR context
  // and are intentionally skipped.
  if (entry !== null && typeof entry === 'object' && 'cssText' in entry) {
    return String((entry as { cssText: string }).cssText);
  }

  return '';
}

/**
 * Returns a `<style>` tag containing the component's `static styles`, or an
 * empty string when no styles are declared.
 */
function extractStyleTag(ComponentClass: ComponentConstructor): string {
  const styles = (ComponentClass as ComponentConstructorWithStyles).styles;
  if (!styles) return '';
  const css = flattenStyleItems(styles);

  return css ? `<style>${css}</style>` : '';
}

/**
 * Builds the host element's attribute string from the component's prop declarations
 * and the provided initial prop values.
 *
 * Only props with `reflect !== false` are included.  A `formatter` is applied when
 * declared; `Boolean` props use presence-only syntax (e.g. `disabled` with no value).
 */
function serializeHostAttrs(propDecls: Props, props: Record<string, unknown>): string {
  let s = '';

  for (const [key, decl] of Object.entries(propDecls)) {
    if (decl.reflect === false) continue;

    const attrName = decl.attr ?? toKebab(key);
    const value = props[key] ?? props[attrName];
    if (value == null) continue;

    if (decl.formatter) {
      const formatted = decl.formatter(value, decl.type);
      if (formatted != null) s += ` ${attrName}="${escapeAttr(formatted)}"`;
    } else if (decl.type === Boolean) {
      const coerced = value === true || value === '' || value === 'true';
      if (coerced) s += ` ${attrName}`;
    } else {
      s += ` ${attrName}="${escapeAttr(typeof value === 'object' ? JSON.stringify(value) : String(value as string | number | boolean))}"`;
    }
  }

  return s;
}

type ClassWithMetadata = { [Symbol.metadata]?: Record<PropertyKey, unknown> };

/**
 * Walks the prototype chain of a component class and merges prop declarations from
 * both `static props` and `@prop` decorator metadata (`Symbol.metadata`).
 *
 * Mirrors `BaseElement._collectProps()` so decorator-declared props are visible to
 * `renderToString` without requiring a DOM environment.
 * Child-class declarations override parent-class declarations.
 */
function collectProps(ComponentClass: ComponentConstructor): Props {
  const chain: object[] = [];
  let cur: object | null = ComponentClass;
  while (cur && cur !== Object.prototype) {
    chain.push(cur);
    cur = Object.getPrototypeOf(cur) as object | null;
  }

  const collected: Props = {};
  for (let i = chain.length - 1; i >= 0; i--) {
    const cls = chain[i] as ComponentConstructor & ClassWithMetadata;
    if (Object.prototype.hasOwnProperty.call(cls, 'props') && cls.props) {
      Object.assign(collected, cls.props);
    }
    const meta = cls[Symbol.metadata];
    if (meta && Object.hasOwn(meta, PROP_METADATA_KEY)) {
      Object.assign(collected, meta[PROP_METADATA_KEY] as Props);
    }
  }

  return collected;
}

/**
 * Walks the prototype chain of a component class and merges computed declarations
 * from both `static computed` and `@computed` decorator metadata (`Symbol.metadata`).
 *
 * Mirrors `BaseElement._collectComputed()`.
 */
function collectComputed(ComponentClass: ComponentConstructor): Computed {
  const chain: object[] = [];
  let cur: object | null = ComponentClass;
  while (cur && cur !== Object.prototype) {
    chain.push(cur);
    cur = Object.getPrototypeOf(cur) as object | null;
  }
  const collected: Computed = {};
  for (let i = chain.length - 1; i >= 0; i--) {
    const cls = chain[i] as ComponentConstructor & ClassWithMetadata;
    if (Object.prototype.hasOwnProperty.call(cls, 'computed') && cls.computed) {
      Object.assign(collected, cls.computed);
    }
    const meta = cls[Symbol.metadata];
    if (meta && Object.hasOwn(meta, COMPUTED_METADATA_KEY)) {
      Object.assign(collected, meta[COMPUTED_METADATA_KEY] as Computed);
    }
  }

  return collected;
}

/**
 * Constructs a plain object that acts as `this` inside the component's `render()` call.
 *
 * Props are coerced to their declared types and assigned directly.  Computed properties
 * are installed as lazy getters so `render()` can access them as normal instance
 * members.  The prototype chain is preserved so class methods remain callable.
 */
function createRenderContext(
  ComponentClass: ComponentConstructor,
  props: Record<string, unknown>,
): Record<string, unknown> {
  const ctx: Record<string, unknown> = Object.create(ComponentClass.prototype as object) as Record<
    string,
    unknown
  >;

  const propDecls = collectProps(ComponentClass);
  for (const [key, decl] of Object.entries(propDecls)) {
    const attrName = decl.attr ?? toKebab(key);
    let value = props[key] ?? props[attrName];
    if (value !== undefined && decl.type) {
      value = coercePropValue(value, decl.type);
    }
    ctx[key] = value;
  }

  // Wire up computed properties so render() can access them.
  const computed = collectComputed(ComponentClass);
  if (Object.keys(computed).length > 0) {
    for (const [key, decl] of Object.entries(computed)) {
      Object.defineProperty(ctx, key, {
        get() {
          return decl.compute(ctx);
        },
        configurable: true,
        enumerable: false,
      });
    }
  }

  return ctx;
}

/** Minimal static shape that `renderToString` requires from a component class. */
interface ComponentConstructor {
  new (): unknown;
  props: Props;
  computed?: Computed;
  useShadowDOM: boolean;
  name: string;
  prototype: { render?: () => RenderResult | null | undefined };
}

/** Extends {@link ComponentConstructor} with optional `static styles` support. */
interface ComponentConstructorWithStyles extends ComponentConstructor {
  styles?: StyleEntry;
}

/**
 * Serialize an Aeico component to an HTML string without instantiating it.
 *
 * No DOM API is invoked - safe to call in Node.js, Edge Runtime, or at build
 * time (SSG).
 *
 * ```ts
 * import { renderToString } from 'aeico-ssr';
 * import { MyCounter } from './my-counter';
 *
 * renderToString(MyCounter, { count: 5 });
 * // '<my-counter count="5"><template shadowrootmode="open"><div>5</div></template></my-counter>'
 * ```
 *
 * **Shadow DOM** (default `useShadowDOM = true`):
 * The inner HTML is wrapped in `<template shadowrootmode="open">` so the browser
 * attaches the shadow root declaratively before the element upgrades (DSR).
 * Paired with the `attachShadow` guard in `BaseElement`, Hydration requires
 * zero extra configuration - the Reconciler reuses the existing DSR nodes on
 * first render.
 *
 * **Light DOM** (`static useShadowDOM = false`):
 * The inner HTML is emitted directly inside the host element tag.
 *
 * @param ComponentClass - The component class (must extend `AeicoBase` or `AeicoElement`).
 * @param props          - Initial prop values. Coerced to the declared types.
 * @returns The rendered HTML string including the host element tag.
 */
export function renderToString(
  ComponentClass: ComponentConstructor,
  props: Record<string, unknown> = {},
  slotContent?: RenderResult,
): string {
  const tagName = (
    globalThis as unknown as { customElements?: { getName(ctor: unknown): string | null } }
  ).customElements?.getName(ComponentClass);

  if (!tagName) {
    throw new Error(
      `renderToString: "${ComponentClass.name}" is not registered. ` +
        `Call ${ComponentClass.name}.define() before renderToString().`,
    );
  }

  const propDecls = collectProps(ComponentClass);
  const hostAttrs = serializeHostAttrs(propDecls, props);
  const ctx = createRenderContext(ComponentClass, props);

  const renderFn = ComponentClass.prototype.render;
  if (!renderFn) {
    return `<${tagName}${hostAttrs}></${tagName}>`;
  }

  const result = renderFn.call(ctx) as RenderResult | undefined;

  if (!result) {
    return `<${tagName}${hostAttrs}></${tagName}>`;
  }

  const serializer = new HtmlSerializer();
  const cb = getCallback(result);
  cb(serializer as unknown as Parameters<typeof cb>[0]);
  const innerHTML = serializer.toString();

  const styleTag = extractStyleTag(ComponentClass);
  const useShadow = ComponentClass.useShadowDOM !== false;

  let slotHtml = '';
  if (slotContent) {
    const slotSerializer = new HtmlSerializer();
    const slotCb = getCallback(slotContent);
    slotCb(slotSerializer as unknown as Parameters<typeof slotCb>[0]);
    slotHtml = slotSerializer.toString();
  }

  if (useShadow) {
    return (
      `<${tagName}${hostAttrs}>` +
      `<template shadowrootmode="open">${styleTag}${innerHTML}</template>` +
      `${slotHtml}</${tagName}>`
    );
  }

  return `<${tagName}${hostAttrs}>${styleTag}${innerHTML}${slotHtml}</${tagName}>`;
}
