# aeico-view

DOM rendering layer for [Aeico](https://github.com/eowl/aeico) — provides `html()`, `render()`, `ElementBuilder`, and `tags`.

## Installation

```bash
npm install aeico-view
```

## Usage

### Tagged template: `html()`

Render declarative HTML inside a Web Component's update cycle:

```typescript
import { html, render } from 'aeico-view';

render(host, () => {
  html`<button class="btn">${label}</button>`;
});
```

### `ElementBuilder` and `tags`

Build DOM imperatively with a fluent API:

```typescript
import { tags } from 'aeico-view';

const { div, button, span } = tags;

div({ className: 'card' }, () => {
  button({ textContent: 'Click me', onclick: () => alert('hi') });
  span({ textContent: 'Hello' });
});
```

### `getActiveBuilder()`

Retrieve the currently-active `ElementBuilder` from within a render callback — useful when building helper utilities:

```typescript
import { getActiveBuilder } from 'aeico-view';

function myHelper(text: string) {
  const builder = getActiveBuilder();
  builder?.span({ textContent: text });
}
```

## API

| Export | Description |
|---|---|
| `html` | Tagged template that renders HTML into the active builder context |
| `render(host, fn)` | Run a render callback against a host element |
| `getActiveBuilder()` | Returns the currently active `ElementBuilder` or `null` |
| `tags` | Proxy object — `tags.div(...)`, `tags.button(...)`, etc. |
| `ElementBuilder` | Class underlying the builder API |

## License

ISC
