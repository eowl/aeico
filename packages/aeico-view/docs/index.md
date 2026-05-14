# aeico-view

Cursor-based DOM rendering — no virtual DOM, zero dependencies.

## Installation

```bash
npm install aeico-view
```

## Core API

| Export | Description |
|---|---|
| `html(cb)` | Declare a render structure; returns a `RenderResult` |
| `render(result, root)` | Apply a `RenderResult` to a DOM node (incremental) |
| `tags` | Proxy giving access to tag helpers outside a callback |
| `getReconciler()` | Access the active `Reconciler` inside a `render()` context |

## `html()` — declare structure

```typescript
import { html } from 'aeico-view'

const tpl = html(({ div, span, button }) => {
  div({ className: 'card' }, () => {
    span({ textContent: 'Hello' })
    button({ onclick: () => alert('hi'), textContent: 'Click' })
  })
})
```

The callback is **not** executed immediately. It runs when passed to `render()`.

## `render()` — apply to DOM

```typescript
import { html, render } from 'aeico-view'

const root = document.getElementById('app')!

function update(count: number) {
  render(
    html(({ div, button, span }) => {
      div({}, () => {
        button({ onclick: () => update(count - 1), textContent: '-' })
        span({ textContent: String(count) })
        button({ onclick: () => update(count + 1), textContent: '+' })
      })
    }),
    root,
  )
}

update(0)
```

Repeated `render()` calls on the **same root** reuse the cached `Reconciler` — only changed nodes are patched.

## Prop syntax reference

See [props-syntax.md](./props-syntax.md) for the full reference covering className maps,
style objects, event handlers, SVG, and custom elements.

## `tags` — outside callback

```typescript
import { tags } from 'aeico-view'

// Access tag helpers without destructuring in a callback.
// Must be called inside an active render() context.
const { div, span } = tags
```

## `getReconciler()` — helper access

```typescript
import { getReconciler } from 'aeico-view'

function renderList(items: string[]) {
  // Call inside an html() callback or render()
  const { ul, li } = getReconciler()
  ul({}, () => items.forEach(item => li({ textContent: item })))
}
```

## Design notes

- No virtual DOM — a cursor tracks position in the real DOM; reconciliation is O(n) with
  the rendered node count, not the full tree.
- Per-root caching — each root node gets its own `Reconciler` stored in a `WeakMap`; GC
  handles cleanup automatically.
- Not a tagged template literal — `html` is a callback DSL with full TypeScript type safety.
- Event handlers are assigned via direct property assignment (`el.onclick = fn`), not
  `addEventListener`. Use `this.listen()` inside lifecycle hooks for managed listeners.
