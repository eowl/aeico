# aeico-localize

Internationalization (i18n) support for [Aeico](https://github.com/eowl/aeico) components.

Provides a reactive locale store, a registry for lazy-loading translations, and a `t()` helper for keyed lookups with fallbacks.

## Installation

```bash
npm install aeico-localize
```

> `aeico-element` (and transitively `aeico-view`) is installed automatically as a dependency.

## Usage

### Basic translation lookup

```typescript
import { t } from 'aeico-localize';

// t(key, fallback?)
const label = t('buttons.save', 'Save');
```

### Load translations

```typescript
import { locale } from 'aeico-localize';

locale.update('zh-CN', {
  buttons: { save: '保存', cancel: '取消' },
});

locale.setLocale('zh-CN');
```

### React to locale changes in a component

```typescript
import { AeicoElement } from 'aeico-element';
import { locale, t } from 'aeico-localize';

class MyButton extends AeicoElement {
  private _unsubscribe?: () => void;

  override connectedCallback() {
    super.connectedCallback();
    this._unsubscribe = locale.subscribe(() => this.requestUpdate());
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribe?.();
  }

  override render() {
    // re-renders automatically when locale changes
    this.builder.button({ textContent: t('buttons.save', 'Save') });
  }
}
```

### Locale registry (lazy loading)

```typescript
import { localeRegistry } from 'aeico-localize';

localeRegistry.register('fr-FR', () => import('./locales/fr-FR.json'));
```

## API

| Export | Description |
|---|---|
| `t(key, fallback?)` | Look up a translation key; returns `fallback` if not found |
| `locale` | The global `LocaleStore` instance |
| `LocaleStore` | Class — `update()`, `setLocale()`, `subscribe()` |
| `localeRegistry` | Registry for lazy-loading locale bundles |
| `LocaleRegistry` | Type — registry interface |
| `LocaleProvider` | Type — translation provider interface |

## License

ISC
