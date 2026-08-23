# aeico-view

Cursor-based DOM rendering - no virtual DOM, zero dependencies.

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

## Reconciler methods

Beyond tag helpers (`div`, `span`, `button`, …), the reconciler also exposes utility
methods that are available inside any `html()` callback:

| Method | Description |
|---|---|
| `text(content)` | Create or reconcile a `Text` node at the cursor position |
| `node(existingNode)` | Insert a pre-built `Node` or `DocumentFragment` into the tree |
| `fragment(cb)` | Build a one-time `DocumentFragment` (no reconciliation, append-only) |
| `detached(fn)` | Run builder calls outside the current build context |
| `el(tagName, props?, cb?)` | Create/reconcile an element with a dynamic tag name string |

### `text(content)` — text nodes

Inserts or reconciles a `Text` node. Inside a build context, the existing text node at
the cursor is reused and its content is updated only when changed:

```typescript
html(({ div, span, text }) => {
  div({}, () => {
    span({ className: 'label' })
    text('Hello world')  // appends a Text node as sibling of the span
    span({ className: 'suffix' })
  })
})
```

Use `text()` when you need to mix text nodes with element siblings — for example,
inline text between two `<span>` elements or text inside a `<pre>` block.

### `node(existingNode)` — insert existing DOM

Inserts a pre-built `Node` (or `DocumentFragment`) into the current parent and advances
the cursor by the correct number of top-level nodes:

```typescript
html(({ div, node }) => {
  div({}, () => {
    const prebuilt = document.createElement('span')
    prebuilt.textContent = 'Injected'
    node(prebuilt)  // inserts the pre-built element at the cursor
  })
})
```

When a `DocumentFragment` is passed, all of its children are transferred and the cursor
skips over all of them. Use this to portal pre-built subtrees or adopt externally
created nodes into the reconciled tree.

### `fragment(cb)` — one-time fragment construction

Runs `cb` inside a bare `DocumentFragment` and returns the populated fragment.
Elements inside the callback are always freshly appended — no cursor-based reconciliation:

```typescript
html(({ div, fragment, span }) => {
  const frag = fragment(() => {
    span({ textContent: 'Static' })
    span({ textContent: 'Content' })
  })
  div({}, () => {
    node(frag)  // insert the populated fragment
  })
})
```

Use `fragment()` for one-time subtree construction (e.g. initial content, template
cloning). Not suitable for re-renderable components — use an `html()` callback instead.

### `detached(fn)` — escape the build context

Executes `fn` without advancing the parent build's cursor, then restores the previous
context. Useful when builder calls must be made inside event handlers or async
callbacks that fire while a `build()` pass is in progress:

```typescript
html(({ div, button, detached }) => {
  div({}, () => {
    button({
      textContent: 'Add',
      onclick: () => {
        detached(() => {
          // builder calls here won't corrupt the parent build's cursor
          const { div: d, span } = getReconciler()
          d({ className: 'toast' }, () => {
            span({ textContent: 'Added!' })
          })
        })
      },
    })
  })
})
```

### `el(tagName, props?, cb?)` — dynamic tag names

Creates or reconciles an element when the tag name is not known at compile time.
Supports the same `(props?, cb?)` / `(cb)` overloads as the Proxy tag helpers:

```typescript
html(({ el, div }) => {
  const tag = isHeading ? 'h1' : 'p'
  el(tag, { textContent: 'Dynamic heading' })

  div({}, () => {
    items.forEach(item => el(item.tag, { textContent: item.label }))
  })
})
```

Prefer the Proxy shorthand (`builder.div(…)`) for statically known tags. Use `el()`
only when the tag name is determined at runtime.

## `html()` - declare structure

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

## `render()` - apply to DOM

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

Repeated `render()` calls on the **same root** reuse the cached `Reconciler` - only changed nodes are patched.

## Prop syntax reference

See [props-syntax.md](./props-syntax.md) for the full reference covering className maps,
style objects, event handlers, SVG, and custom elements.

## `tags` - outside callback

```typescript
import { tags } from 'aeico-view'

// Access tag helpers without destructuring in a callback.
// Must be called inside an active render() context.
const { div, span } = tags
```

## `getReconciler()` - helper access

```typescript
import { getReconciler } from 'aeico-view'

function renderList(items: string[]) {
  // Call inside an html() callback or render()
  const { ul, li } = getReconciler()
  ul({}, () => items.forEach(item => li({ textContent: item })))
}
```

## Design notes

- No virtual DOM - a cursor tracks position in the real DOM; reconciliation is O(n) with
  the rendered node count, not the full tree.
- Per-root caching - each root node gets its own `Reconciler` stored in a `WeakMap`; GC
  handles cleanup automatically.
- Not a tagged template literal - `html` is a callback DSL with full TypeScript type safety.
- Event handlers are assigned via direct property assignment (`el.onclick = fn`), not
  `addEventListener`. Use `this.listen()` inside lifecycle hooks for managed listeners.
