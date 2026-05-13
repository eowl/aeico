# Aeico

**A**dvanced **E**lement **I**nterface for **C**omponent **O**bjects — a lightweight Web Components framework with reactive properties, declarative DOM rendering, and i18n support.

## Packages

| Package | Version | Description |
|---|---|---|
| [`aeico`](packages/aeico) | 0.1.4 | Meta package — re-exports base |
| [`aeico-element`](packages/aeico-element) | 0.1.3 | Reactive base classes and decorators |
| [`aeico-view`](packages/aeico-view) | 0.1.2 | DOM rendering — `html()`, `render()`, `tags` |
| [`aeico-localize`](packages/aeico-localize) | 0.1.1 | i18n — `t()`, `locale`, `localeRegistry` |
| [`aeico-ssr`](packages/aeico-ssr) | 0.1.0 | Server-side rendering — `renderHtml()`, `renderToString()` |

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
import { AeicoElement, prop, watch } from 'aeico-element';
import { html } from 'aeico-view';

class MyCounter extends AeicoElement {
  @prop() accessor count = 0;

  @watch('count')
  onCountChange(next: number) {
    console.log('count is now', next);
  }

  override render() {
    return html(({ button, span }) => {
      button({ onclick: () => this.count++, textContent: '+' });
      span({ textContent: String(this.count) });
    });
  }
}

MyCounter.register('my-counter');
```

## i18n

```typescript
import { locale, t } from 'aeico-localize';

// update() sets the language and loads translations in one call
locale.update('zh-CN', { hello: '你好' });

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
