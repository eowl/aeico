# Aeico

**A**dvanced **E**lement **I**nterface for **C**omponent **O**bjects — a lightweight Web Components framework with reactive properties, declarative DOM rendering, and i18n support.

## Packages

| Package | Version | Description |
|---|---|---|
| [`aeico`](packages/aeico) | 0.1.1 | Meta package — re-exports everything |
| [`aeico-element`](packages/aeico-element) | 0.1.1 | Reactive base classes and decorators |
| [`aeico-view`](packages/aeico-view) | 0.1.1 | DOM rendering — `html()`, `render()`, `tags` |
| [`aeico-localize`](packages/aeico-localize) | 0.1.1 | i18n — `t()`, `locale`, `localeRegistry` |

## Installation

```bash
# Install everything at once
npm install aeico

# Or install individual packages
npm install aeico-element aeico-view
npm install aeico-localize  # optional i18n support
```

## Quick Start

```typescript
import { AeicoElement } from 'aeico-element';
import { prop, watch } from 'aeico-element';
import { tags } from 'aeico-view';

class MyCounter extends AeicoElement {
  @prop() accessor count = 0;

  @watch('count')
  onCountChange(next: number) {
    console.log('count is now', next);
  }

  override render() {
    const { button, span } = tags;
    button({ onclick: () => this.count++, textContent: '+' });
    span({ textContent: String(this.count) });
  }
}

customElements.define('my-counter', MyCounter);
```

## i18n

```typescript
import { locale, t } from 'aeico-localize';

locale.update('zh-CN', { hello: '你好' });
locale.setLocale('zh-CN');

console.log(t('hello', 'Hello')); // "你好"
```

## Development

```bash
# Install dependencies
npm install

# Build all packages
npm run build --workspaces

# Test all packages
npm run test --workspaces --if-present
```

## License

ISC
