# aeico-element

Reactive element base classes and decorators for [Aeico](https://github.com/eowl/aeico).

Provides `AeicoElement` / `AeicoBase`, reactive `@prop` / `@watch` / `@computed` decorators, stylesheet management, and mixins.

## Installation

```bash
npm install aeico-element
```

> `aeico-view` is installed automatically as a dependency.

## Usage

### Define a custom element

```typescript
import { AeicoElement } from 'aeico-element';
import { prop, watch } from 'aeico-element';
import { tags } from 'aeico-view';

class MyCounter extends AeicoElement {
  @prop() accessor count = 0;

  @watch('count')
  onCountChange(next: number, prev: number) {
    console.log(`${prev} → ${next}`);
  }

  override render() {
    const { button, span } = tags;
    button({ onclick: () => this.count++, textContent: '+' });
    span({ textContent: String(this.count) });
  }
}

customElements.define('my-counter', MyCounter);
```

### `@computed` accessor

```typescript
import { computed } from 'aeico-element';

class MyElement extends AeicoElement {
  @prop() accessor firstName = '';
  @prop() accessor lastName = '';

  @computed
  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }
}
```

### Stylesheets

```typescript
import { styleStore } from 'aeico-element';

styleStore.add('my-counter', () => css`
  :host { display: block; }
  button { margin: 4px; }
`);
```

### Mixins

```typescript
import { compose } from 'aeico-element/mixins';
import { Themeable } from 'aeico-element/mixins';

class MyElement extends compose(AeicoElement, Themeable) { /* ... */ }
```

## API

| Export | Description |
|---|---|
| `AeicoElement` | Full reactive element — props, rendering, styles, events |
| `AeicoBase` | Minimal base without rendering helpers |
| `prop` | Decorator to declare a reactive property |
| `watch` | Decorator to watch a reactive property for changes |
| `computed` | Decorator for a derived (memoised) accessor |
| `styleStore` | Global stylesheet store |
| `StyleResult` | Tagged template helper (`css\`...\``) |
| `getCurrentContext` | Returns the current render context |

## License

ISC
