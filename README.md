# Aeico

**A**dvanced **E**lement **I**nterface for **C**omponent **O**bjects — a lightweight Web Components framework with reactive properties, declarative DOM rendering, and i18n support.

## Packages

| Package | Version | Description |
|---|---|---|
| [`aeico`](packages/aeico) | 0.1.6 | **Main entry** — bundles `aeico-element` + `aeico-view` |
| [`aeico-element`](packages/aeico-element) | 0.1.6 | Reactive base classes and decorators |
| [`aeico-view`](packages/aeico-view) | 0.1.3 | DOM rendering — `html()`, `render()`, `tags` |
| [`aeico-localize`](packages/aeico-localize) | 0.1.1 | *(optional)* i18n — `t()`, `locale`, `localeRegistry` |
| [`aeico-ssr`](packages/aeico-ssr) | 0.1.7 | *(optional)* Server-side rendering — `renderHtml()`, `renderToString()` |
| [`aeico-signals`](packages/aeico-signals) | 0.1.0 | *(optional)* TC39 Signals proposal polyfill |

`aeico-element` depends on `aeico-view`. `aeico-localize` depends on `aeico-element`. `aeico-ssr` requires `aeico-view` (+ optional `aeico-element`). `aeico-signals` is standalone.

## Installation

```bash
# Recommended: install everything at once
npm install aeico

# Or pick individual core packages
npm install aeico-element aeico-view

# Optional extensions
npm install aeico-localize   # i18n
npm install aeico-ssr        # server-side rendering
npm install aeico-signals    # TC39 Signals polyfill
```

## Quick Start

```typescript
import { AeicoElement, prop, watch, html } from 'aeico';

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
