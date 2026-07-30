# aeico-element

Reactive base classes and decorators for building Web Components.

## Installation

```bash
npm install aeico-element aeico-view
# or install the meta-package
npm install aeico
```

## Base Classes

| Class | Style system | When to use |
|---|---|---|
| `AeicoElement` | Full (adoptedStyleSheets) | Most components |
| `AeicoBase` | None | Style-free utility components |

Both share the same reactive system, lifecycle, and decorator support.

## Quick example

```typescript
import { AeicoElement, prop, watch, computed } from 'aeico-element'
import { html } from 'aeico-view'

class MyCounter extends AeicoElement {
  @prop({ type: Number }) accessor count = 0

  @computed('count')
  get doubled() { return this.count * 2 }

  @watch('count')
  onCountChange(next: number, prev: number) {
    console.log(`${prev} -> ${next}`)
  }

  override render() {
    return html(({ div, button, span }) => {
      div({}, () => {
        button({ onclick: () => this.count--, textContent: '-' })
        span({ textContent: String(this.count) })
        button({ onclick: () => this.count++, textContent: '+' })
      })
    })
  }

  static override styles = `
    button { padding: 4px 8px; cursor: pointer; }
  `
}

MyCounter.define('my-counter')
```

## Registration

```typescript
MyEl.define('my-el')      // custom element tag name (must contain a dash)
MyEl.define('x-button')   // explicit tag name
```

## Shadow DOM options

```typescript
class MyEl extends AeicoElement {
  // Render into light DOM instead of shadow root
  static useShadowDOM = false

  // Customize shadow root init options (default: open + delegatesFocus)
  static shadowOptions: ShadowRootInit = { mode: 'open', delegatesFocus: false }
}
```

## Further reading

- [Decorators](./decorators.md) - @prop, @watch, @computed, static config alternative
- [Lifecycle, styles and events](./lifecycle.md) - hooks, styles, events, TypeScript types
