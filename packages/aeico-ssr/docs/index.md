# aeico-ssr

Server-side rendering for Aeico components — no DOM API required.

## Installation

```bash
npm install aeico-ssr
```

## Core API

| Export | Description |
|---|---|
| `renderHtml(result)` | Serialize an `html()` `RenderResult` to an HTML string |
| `renderToString(ComponentClass, props?, slotContent?)` | Serialize a full component class to an HTML string |
| `HtmlSerializer` | Low-level serializer (Reconciler-compatible, for advanced use) |

Both functions are safe to call in **Node.js**, **Edge Runtime** (Cloudflare Workers, Vercel Edge), and at **build time** (SSG).

## `renderHtml()` — render a template

Serializes an `html()` template without any component context:

```typescript
import { html } from 'aeico-view'
import { renderHtml } from 'aeico-ssr'

const result = html(({ div, span, ul, li }) => {
  div({ className: 'card' }, () => {
    span({ textContent: 'Hello SSR' })
    ul({}, () => {
      ['a', 'b', 'c'].forEach(item => li({ textContent: item }))
    })
  })
})

renderHtml(result)
// '<div class="card"><span>Hello SSR</span><ul><li>a</li><li>b</li><li>c</li></ul></div>'
```

Event handlers (`onclick`, etc.) are silently dropped in the SSR output.

## `renderToString()` — render a component

Serializes a full component class including props, styles, and shadow DOM:

```typescript
import { renderToString } from 'aeico-ssr'
import { MyCounter } from './my-counter'

// With Shadow DOM (default) — wraps content in <template shadowrootmode="open">
renderToString(MyCounter, { count: 5 })
// '<my-counter count="5"><template shadowrootmode="open"><style>...</style><div>5</div></template></my-counter>'

// Props are coerced to declared types and reflected to attributes
renderToString(MyCounter, { count: '10' })  // count attr on host + prop coerced to Number
```

### Slot content

Pass an `html()` template as the optional third argument to inject light DOM children into the host element. These children are distributed into the component's `<slot>` elements by the browser.

```typescript
import { html } from 'aeico-view'
import { renderToString } from 'aeico-ssr'
import { AeNavbar } from './ae-navbar'

// Inline
renderToString(AeNavbar, { siteTitle: 'Docs' }, html(({ a }) => {
  a({ slot: 'brand', href: '/', text: 'Docs' })
  a({ slot: 'start', href: '/guide', text: 'Guide' })
}))
// '<ae-navbar site-title="Docs"><template shadowrootmode="open">...</template>
//   <a slot="brand" href="/">Docs</a>
//   <a slot="start" href="/guide">Guide</a>
// </ae-navbar>'

// Reusable — define once, pass to many renderToString calls
const navSlot = html(({ a }) => {
  a({ slot: 'brand', href: '/', text: siteTitle })
  for (const item of navItems) {
    a({ slot: 'start', href: item.href, text: item.label })
  }
})

for (const page of pages) {
  renderToString(PageLayout, page, navSlot)
}
```

Named slots use the `slot="name"` attribute on the top-level element, matching the browser's native slot-assignment convention. Default slot content (no `slot` attribute) fills the component's unnamed `<slot>`.

### Declarative Shadow Root (DSR) & hydration

The `<template shadowrootmode="open">` output is parsed by modern browsers **before** JavaScript executes. When the Aeico component class upgrades, `BaseElement` detects the pre-existing shadow root and skips `attachShadow()`. The `Reconciler` reuses the existing DSR nodes on first render — **zero extra hydration code required**.

### Light DOM components

```typescript
class MyEl extends AeicoElement {
  static useShadowDOM = false
}

renderToString(MyEl, { label: 'Hello' })
// '<my-el label="Hello"><span>Hello</span></my-el>'
// No <template> wrapper when useShadowDOM = false
```

## Prop serialization rules

| Prop type | HTML attribute output |
|---|---|
| `String` | `attr="value"` |
| `Number` | `attr="42"` |
| `Boolean` (true) | `attr` (presence-only) |
| `Boolean` (false) | omitted |
| `Array` / `Object` | `attr="[...]"` / `attr="{...}"` (JSON) |
| `reflect: false` | omitted |
| Custom `formatter` | result of `formatter(value, type)` |

## Style serialization

`static styles` from `AeicoElement` subclasses is inlined as a `<style>` tag inside the shadow root template:

```html
<template shadowrootmode="open">
  <style>button { color: red; }</style>
  <!-- component DOM -->
</template>
```

`StyleResult` objects (with `.cssText`) are serialized; browser-only `CSSStyleSheet` instances are skipped.
