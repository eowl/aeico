# aeico-ssr

Server-side rendering for [Aeico](../../README.md) - serialize `html()` templates and Aeico components to HTML strings without any DOM dependency.

Safe to use in Node.js, Edge Runtime (Cloudflare Workers, Vercel Edge Functions), and at build time (SSG).

---

## Installation

```bash
npm install aeico-ssr
```

`aeico-ssr` is a standalone optional package.  The core `aeico-view` package has **zero** dependency on it - install it only when you need server-side or build-time HTML generation.

### Peer dependencies

| Package | Required | When |
|---|---|---|
| `aeico-view` | Yes | always |
| `aeico-element` | optional | only for `renderToString` |

---

## API

### `renderHtml(renderable)`

Serializes a `Renderable` (produced by `html()`) to an HTML string.

```ts
import { html } from 'aeico-view';
import { renderHtml } from 'aeico-ssr';

const result = html(({ div, span }) => {
  div({ className: 'card' }, () => {
    span({ text: 'Hello SSR' });
  });
});

renderHtml(result);
// '<div class="card"><span>Hello SSR</span></div>'
```

**Serialization rules**

| Prop | Behaviour |
|---|---|
| `text` / `textContent` | Emitted as HTML-escaped text content |
| `className` / `class` (string) | Emitted as `class="…"` |
| `className` / `class` (object) | Truthy keys are joined: `{ active: true, hidden: false }` produces `class="active"` |
| `style` (object) | Serialized as inline style: `{ color: 'red' }` produces `style="color:red"` - camelCase keys are converted to kebab-case; CSS custom properties (`--foo`) are kept as-is |
| `key` | Emitted as `data-key="…"` |
| `disabled: true` / boolean `true` | Presence-only attribute (e.g. `disabled`) |
| `disabled: false` / `null` / `undefined` | Attribute omitted entirely |
| `@click` / any `@…` event handler | **Stripped** - events are client-only |
| Complex object props (arrays, DOM refs) | **Skipped** - cannot be serialized as HTML attributes |
| Void elements (`br`, `hr`, `input`, …) | No closing tag |
| camelCase tag name (e.g. `myCounter`) | Converted to kebab-case: `<my-counter>` |

---

### `renderToString(ComponentClass, props?, slotContent?)`

Serializes an Aeico component class to a complete HTML string including the host element tag, reflected attributes, and inner markup - **without instantiating the element or touching the DOM**.

```ts
import { renderToString } from 'aeico-ssr';
import { MyCounter } from './my-counter';

renderToString(MyCounter, { count: 5 });
// '<my-counter count="5"><template shadowrootmode="open"><div>5</div></template></my-counter>'
```

#### Shadow DOM (default)

When `static useShadowDOM = true` (the default for `AeicoElement`), the inner markup is wrapped in a [Declarative Shadow Root](https://developer.chrome.com/docs/css-ui/declarative-shadow-dom) template:

```html
<my-counter count="5">
  <template shadowrootmode="open">
    <div>5</div>
  </template>
</my-counter>
```

The browser attaches the shadow root declaratively before the custom element upgrades.  `AeicoElement` and `AeicoBase` guard `attachShadow` so they do not overwrite a DSR shadow root that the browser has already created, meaning hydration requires zero extra configuration - the `Reconciler` reuses the existing DSR nodes on first render.

If `static styles` is declared on the component, a `<style>` tag is injected inside the template immediately before the inner markup.

#### Light DOM

When `static useShadowDOM = false`, the inner markup is emitted directly inside the host element tag:

```ts
renderToString(MyLight, { label: 'hello' });
// '<my-light label="hello"><p>hello</p></my-light>'
```

#### Prop coercion

Props passed to `renderToString` are coerced to the types declared in `static props`:

```ts
static props = {
  count: { type: Number, reflect: true },
};
```

Passing `{ count: '5' }` (string) coerces to `5` (number) before the component's `render()` method is called.

Accepted types: `Number`, `Boolean`, `String`, `Array`, `Object`.

#### Computed properties

If the component declares `static computed`, those properties are wired up as lazy getters on the render context so `render()` can access them normally.

#### Tag name resolution

`renderToString` derives the tag name from `customElements.getName()` (the name passed to `define()`).

A tag name without a hyphen (invalid custom element name) causes `renderToString` to throw.

#### Slot content

Pass an `html()` `Renderable` as the optional third argument to inject light DOM children into the host element.  These children are distributed into the component's `<slot>` elements by the browser at parse time.

```ts
import { html } from 'aeico-view';
import { renderToString } from 'aeico-ssr';
import { AeNavbar } from './ae-navbar';

renderToString(AeNavbar, { siteTitle: 'Docs' }, html(({ a }) => {
  a({ slot: 'brand', href: '/', text: 'Docs' });
  a({ slot: 'start', href: '/guide', text: 'Guide' });
}));
// '<ae-navbar site-title="Docs">
//   <template shadowrootmode="open">...</template>
//   <a slot="brand" href="/">Docs</a>
//   <a slot="start" href="/guide">Guide</a>
// </ae-navbar>'
```

Because the third argument is a plain `Renderable`, it can be defined once and reused across many `renderToString` calls:

```ts
const navSlot = html(({ a }) => {
  a({ slot: 'brand', href: '/', text: siteTitle });
  for (const item of navItems) {
    a({ slot: 'start', href: item.href, text: item.label });
  }
});

for (const page of pages) {
  renderToString(PageLayout, page, navSlot);
}
```

Named slots use the `slot="name"` attribute on the top-level element, matching the browser's native slot-assignment convention.  Content without a `slot` attribute fills the unnamed default `<slot>`.

---

### `HtmlSerializer`

Low-level building block used internally by `renderHtml` and `renderToString`.

`HtmlSerializer` mirrors the `Reconciler` API via a `Proxy`: arbitrary camelCase property accesses are intercepted and dispatched as tag calls, exactly as on the client.

```ts
import { HtmlSerializer } from 'aeico-ssr';

const s = new HtmlSerializer();
(s as any).div({ className: 'box' }, () => {
  (s as any).span({ text: 'hello' });
});
s.toString(); // '<div class="box"><span>hello</span></div>'
```

Because `HtmlSerializer` is typed separately from `Reconciler` (to avoid DOM dependencies), use `as any` or `as unknown as Reconciler` when passing it where a `Reconciler` is expected.

#### Methods

| Method | Description |
|---|---|
| `toString()` | Returns the accumulated HTML string |
| `reset()` | Clears the buffer so the instance can be reused |
| `text(content)` | Appends an HTML-escaped text node |
| `fragment(cb)` | Runs `cb` inline without wrapping in a tag |
| `detached(fn)` | Executes `fn` directly (no-op context switch - SSR has no stateful render context) |
| `node(_existingNode)` | No-op - client-only operation; node will be rendered on upgrade |
| `el(tagName, props?, cb?)` | Explicit dynamic-tag API (same as client-side `Reconciler.el`) |

---

## SSR constraints

`renderToString` constructs a **plain render context** via `Object.create(ComponentClass.prototype)` and assigns props directly - it never calls `new ComponentClass()`. As a result, **lifecycle methods do not run during SSR**. The table below shows what this means in practice:

| Lifecycle | Runs in SSR? | Notes |
|---|---|---|
| `render()` | Yes | Always called - this is what generates the HTML |
| `static computed` | Yes | Installed as lazy getters on the render context |
| `onPrepare()` | No | See below |
| `onMounted()` | No | Correct - browser-only (DOM queries, event listeners, animations) |
| `onUpdated()` | No | Correct - reactive update cycle is browser-only |
| `connectedCallback()` | No | Correct - browser-only |

### `onPrepare` and state derived from props

The most common pitfall is using `onPrepare` to compute values that `render()` then reads:

```ts
// SSR-unfriendly: render() depends on state set in onPrepare
class ProductCard extends AeicoBase {
  static props = { rawPrice: { type: Number } };
  rawPrice?: number;
  formattedPrice?: string; // not a prop - invisible to renderToString

  protected onPrepare() {
    this.formattedPrice = `¥${((this.rawPrice ?? 0) / 100).toFixed(2)}`;
  }

  protected render() {
    return html(({ span }) => span({ text: this.formattedPrice })); // undefined in SSR
  }
}
```

The fix is to make `render()` a **pure function of props**. Two idiomatic approaches:

**Option A - derive inline in `render()`:**

```ts
protected render() {
  const formatted = `¥${((this.rawPrice ?? 0) / 100).toFixed(2)}`;
  return html(({ span }) => span({ text: formatted }));
}
```

**Option B - declare as `static computed`:**

```ts
static computed = {
  formattedPrice: {
    deps: ['rawPrice'],
    compute: (ctx: ProductCard) => `¥${((ctx.rawPrice ?? 0) / 100).toFixed(2)}`,
  },
};
declare formattedPrice: string;

protected render() {
  return html(({ span }) => span({ text: this.formattedPrice })); // works in both SSR and browser
}
```

**Option B (decorator syntax) - use `@computed`:**

```ts
import { computed } from 'aeico-element/decorators';

@computed('rawPrice')
get formattedPrice() {
  return `¥${((this.rawPrice ?? 0) / 100).toFixed(2)}`;
}

protected render() {
  return html(({ span }) => span({ text: this.formattedPrice })); // works in both SSR and browser
}
```

Both forms of `static computed` / `@computed` are wired up as lazy getters in `createRenderContext`, so they evaluate correctly in SSR.

### Async data

Lifecycle-driven data fetching (`fetch` inside `onMounted`) cannot run during SSR. The recommended pattern is to fetch data at the **route/framework level** and pass it as props:

```ts
// server route
const user = await fetchUser(req.params.id);
const html = renderToString(UserCard, { name: user.name, avatar: user.avatar });
```

This is the same constraint as React Server Components, Nuxt `asyncData`, and SvelteKit `load` - SSR-friendly components receive all initial data through their public interface rather than fetching it internally.

### Summary rule

> **If the initial visual output of a component depends solely on its props (and computed properties derived from props), it is SSR-compatible with zero changes.**
> Lifecycle methods that perform DOM operations, set up event listeners, or trigger side effects are browser-only by design and do not need to be SSR-aware.

---

## Hydration

No special hydration step is required.

On the client, `AeicoElement` / `AeicoBase` guard `attachShadow` so they do not overwrite a DSR shadow root that the browser has already created.  The first `render()` call runs a normal reconciliation pass against the existing nodes, adopting them in-place with minimal DOM mutations.

---

## Security

All text content and attribute values are HTML-escaped before being emitted:

- `&` becomes `&amp;`
- `<` becomes `&lt;` (text only)
- `>` becomes `&gt;` (text only)
- `"` becomes `&quot;` (attributes only)

Event handlers (`@…` props) are stripped entirely and never appear in the output.

---

## Comparison with `renderHtml`

| | `renderHtml` | `renderToString` |
|---|---|---|
| Input | `Renderable` (from `html()`) | Component class + props |
| Output | HTML fragment | Complete host element HTML |
| Host tag | not included | Yes included |
| Reflected attrs | No | Yes |
| Shadow / Light DOM | No | Yes |
| `static styles` | No | Yes |
| Slot content | No | Yes (3rd arg) |
| Requires `aeico-element` | No | Yes (peer dep) |

---

## Building

```bash
npm run build        # rollup build + tsc declaration emit
npm run dev          # rollup --watch
npm run type-check   # tsc --noEmit
npm test             # build then node --test
```
