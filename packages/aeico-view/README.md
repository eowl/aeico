# aeico-view

Cursor-based DOM reconciler for the browser - framework-free, zero virtual DOM.  
Works in plain HTML pages, vanilla web components, and as the rendering layer of the [Aeico](https://github.com/eowl/aeico) framework.  
Provides `html()`, `render()`, `tags`, `getReconciler()`, and the `Reconciler` class.

## How it works

aeico-view uses a **cursor-based reconciler** rather than a virtual DOM.  On each render pass the `Reconciler` walks the existing child list in lock-step with the render callback.  Nodes at the right position with the right tag are reused; only props that changed are written to the DOM.  Nodes no longer visited are removed.  No diffing tree is allocated - reconciliation happens directly against the live DOM.

## Installation

```bash
npm install aeico-view
```

## Usage

### Plain HTML page

Drop it into any project - no framework, no build tool required beyond a bundler or native ES modules:

```typescript
import { html, render } from 'aeico-view';

// html() accepts a callback - it is NOT a template literal tag.
const tpl = html(({ div, span, button }) => {
  div({ className: 'card' }, () => {
    span({ text: 'Hello world' });
    button({ text: 'Click me', '@click': () => alert('hi') });
  });
});

// render() applies the template to a root node.
// Repeated calls reuse the same Reconciler instance and only patch what changed.
render(tpl, document.querySelector('#app')!);
```

### Vanilla web component (no base class required)

aeico-view works with any `HTMLElement` subclass.  Use `html()` + `render()` directly inside your component methods - there is no required lifecycle adapter or mixin:

```typescript
import { html, render } from 'aeico-view';

class MyCounter extends HTMLElement {
  count = 0;
  shadow = this.attachShadow({ mode: 'open' });

  connectedCallback() { this.render(); }

  increment() { this.#count++; this.render(); }

  render() {
    render(
      html(({ div, span, button }) => {
        div(() => {
          span({ text: String(this.#count) });
          button({ text: '+', '@click': () => this.increment() });
        });
      }),
      this.#shadow,
    );
  }
}

customElements.define('my-counter', MyCounter);
```

Each call to `#render()` reconciles the shadow DOM in-place: only changed text or attributes are written, and the existing element nodes are reused.

### Low-level: `Reconciler` directly

Skip `html()` / `render()` and drive the reconciler yourself:

```typescript
import { Reconciler } from 'aeico-view';

const r = new Reconciler();
const root = document.querySelector('#app')!;

function draw(count: number) {
  r.build(root, () => {
    r.p({ text: `Count: ${count}` });
  });
}

draw(0); // initial render
draw(1); // patches only the text content
```

## Template anatomy

### Tag helpers

Every HTML and SVG tag is available as a method on the Reconciler.  
The overloads are `(props?, cb?)` and `(cb)`:

```typescript
html(({ div, p, ul, li, svg, circle }) => {
  div({ id: 'wrapper' }, () => {
    p({ text: 'paragraph' });
    ul(() => {
      li({ text: 'item 1' });
      li({ text: 'item 2' });
    });
    // SVG namespace is auto-detected from the svg tag and inherited by children.
    svg({ viewBox: '0 0 100 100' }, () => {
      circle({ cx: '50', cy: '50', r: '40' });
    });
  });
});
```

### Custom elements

camelCase property names are automatically converted to kebab-case tag names:

```typescript
html(({ myWidget, benchRow }) => {
  myWidget();    // yields <my-widget>
  benchRow();    // yields <bench-row>
});
```

### Dynamic tag names

Use `el()` when the tag is determined at runtime:

```typescript
html((b) => {
  const tag = isHeading ? 'h1' : 'h2';
  b.el(tag, { text: title });
});
```

### Text nodes

```typescript
html((b) => {
  b.text('plain text node');
});
```

### Fragments

`fragment()` creates a `DocumentFragment` context.  Elements inside are always freshly appended (not reconciled), making it suitable for one-time subtree construction:

```typescript
html((b) => {
  const frag = b.fragment(() => {
    b.li({ text: 'a' });
    b.li({ text: 'b' });
  });
  myList.appendChild(frag);
});
```

### Pre-built nodes

Insert an existing node or fragment into the reconciled tree:

```typescript
html((b) => {
  b.div(() => {
    b.node(someExternalNode);
  });
});
```

## Props reference

| Prop | Type | Effect |
|---|---|---|
| `text` / `textContent` | `string` | Sets `element.textContent` |
| `className` / `class` | `string` or `Record<string, boolean>` | Sets the `class` attribute |
| `style` | `Record<string, string>` | Merges into inline style; supports `--custom-props` |
| `key` | `string` | Keyed reconciliation hint - not written to the DOM |
| `@click`, `@input`, … | `EventListener` | Adds event listener; old listener removed on change |
| `disabled`, `hidden`, … | `true` | Presence-only attribute (`setAttribute(k, '')`) |
| any other key | `object` | Assigned as a JS property |
| any other key | `string \| number` | Set via `setAttribute` |
| `null \| false` | - | Removes the attribute / listener |

### Class object map

```typescript
div({ class: { active: isActive, hidden: !isVisible } });
// yields class="active" when isActive=true, isVisible=true
```

### Style object

```typescript
span({ style: { color: 'red', '--my-var': '42px' } });
```

### Event handlers

```typescript
button({ '@click': handleClick, '@pointerenter': handleHover });
```

## Keyed lists

Add a `key` prop to preserve element identity across list reorders.  
The reconciler will move the existing DOM node to the correct position rather than recreating it:

```typescript
html(({ ul, li }) => {
  ul(() => {
    for (const item of items) {
      li({ key: item.id, text: item.label });
    }
  });
});
```

## `tags` - destructure outside the callback

`tags` is a proxy that always delegates to the currently active `Reconciler`.  
Useful when you want to destructure helpers at the top of a method rather than in the callback:

```typescript
import { html, render, tags } from 'aeico-view';

const { div, span } = tags; // Must be used inside a render() call

render(html(() => {
  div(() => {
    span({ text: 'hello' });
  });
}), root);
```

## `getReconciler()`

Returns the `Reconciler` that is currently executing inside a `render()` call.  
Throws outside a render context.  Useful in helper functions that need builder access without receiving it as a parameter:

```typescript
import { getReconciler } from 'aeico-view';

function badge(label: string) {
  const b = getReconciler();
  b.span({ className: 'badge', text: label });
}

render(html(() => {
  badge('new');
}), root);
```

## `detached()`

Run builder calls outside the active build context.  Use this inside event handlers or async callbacks that fire while a `render()` pass is in progress - without detaching, those calls would incorrectly advance the parent cursor:

```typescript
html((b) => {
  b.button({
    '@click': () => b.detached(() => {
      // Safe to call builder methods here even if the click fires mid-render.
      b.div({ text: 'appended' });
    }),
  });
});
```

## ShadowRoot support

`render()` accepts any `Node` as its root, including a `ShadowRoot`:

```typescript
const shadow = host.attachShadow({ mode: 'open' });
render(html(({ div }) => { div({ text: 'shadow content' }); }), shadow);
```

## API summary

| Export | Signature | Description |
|---|---|---|
| `html` | `(cb: (t: Tags) => void) => Renderable` | Creates a deferred render template |
| `render` | `(renderable: Renderable, root: Node) => void` | Applies a template to a root node |
| `tags` | `Tags` (proxy) | Tag view of the active Reconciler |
| `getReconciler` | `() => Reconciler` | Returns the active Reconciler (throws if none) |
| `Reconciler` | class | Core cursor-based DOM reconciler (`Tags` superset) |
| `Tags` | type | Tag vocabulary passed to `html()` callbacks |
| `TagProps` | type | Prop bag accepted by all tag helpers |
| `Renderable` | class | Opaque wrapper returned by `html()` |
