# aeico

Meta-package — re-exports `aeico-element` and `aeico-view` for one-line installation.

## Installation

```bash
npm install aeico
# Optionally:
npm install aeico-localize  # i18n
npm install aeico-ssr       # server-side rendering
```

## What's included

| Package | Exports |
|---|---|
| `aeico-element` | `AeicoElement`, `AeicoBase`, `@prop`, `@watch`, `@computed`, types |
| `aeico-view` | `html`, `render`, `tags`, `getReconciler` |

## Quick start

```typescript
import { AeicoElement, prop, watch, computed } from 'aeico-element'
import { html } from 'aeico-view'

class MyCounter extends AeicoElement {
  @prop({ type: Number }) accessor count = 0

  @computed('count')
  get doubled() { return this.count * 2 }

  @watch('count')
  onCountChange(next: number, prev: number) {
    console.log(`${prev} → ${next}`)
  }

  override render() {
    return html(({ div, button, span }) => {
      div({}, () => {
        button({ onclick: () => this.count--, textContent: '-' })
        span({ textContent: String(this.count) })
        button({ onclick: () => this.count++, textContent: '+' })
        span({ textContent: `doubled: ${this.doubled}` })
      })
    })
  }

  static override styles = `
    :host { display: flex; gap: 8px; align-items: center; }
    button { padding: 4px 8px; cursor: pointer; }
  `
}

MyCounter.register('my-counter')
```

```html
<my-counter count="0"></my-counter>
```

## Per-package docs

- [aeico-element](../aeico-element/docs/index.md) — Overview, registration, shadow DOM
  - [Decorators](../aeico-element/docs/decorators.md) — @prop, @watch, @computed, static config
  - [Lifecycle, styles and events](../aeico-element/docs/lifecycle.md) — hooks, styles, events, TypeScript types
- [aeico-view](../aeico-view/docs/index.md) — html(), render(), design notes
  - [Prop syntax reference](../aeico-view/docs/props-syntax.md) — className, style, events, SVG, custom elements
- [aeico-localize](../aeico-localize/docs/index.md) — i18n, t(), locale
- [aeico-ssr](../aeico-ssr/docs/index.md) — Server-side rendering, DSR hydration
