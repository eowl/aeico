# aeico

Lightweight Web Components framework — reactive elements, declarative DOM rendering, and i18n support.

`aeico` is a meta package that re-exports everything from [`aeico-element`](https://www.npmjs.com/package/aeico-element) and [`aeico-view`](https://www.npmjs.com/package/aeico-view).

## Installation

```bash
npm install aeico
```

For i18n support, also install:

```bash
npm install aeico-localize
```

## Quick Start

```typescript
import { AeicoElement } from 'aeico';
import { prop, watch } from 'aeico';
import { tags } from 'aeico';

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

locale.update('zh-CN', { save: '保存' });
locale.setLocale('zh-CN');

console.log(t('save', 'Save')); // "保存"
```

## Packages

| Package | Description |
|---|---|
| [`aeico-element`](https://www.npmjs.com/package/aeico-element) | Reactive base classes and decorators |
| [`aeico-view`](https://www.npmjs.com/package/aeico-view) | DOM rendering — `html()`, `render()`, `tags` |
| [`aeico-localize`](https://www.npmjs.com/package/aeico-localize) | i18n — `t()`, `locale`, `localeRegistry` |

## License

ISC
