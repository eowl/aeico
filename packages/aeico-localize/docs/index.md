# aeico-localize

Reactive i18n for Aeico components — automatic re-render on locale change.

## Installation

```bash
npm install aeico-localize
```

## Core API

| Export | Description |
|---|---|
| `t(key, fallback?)` | Translate a dot-path key; auto-subscribes the current component |
| `locale` | Global `LocaleStore` instance |
| `LocaleStore` | Class — create isolated stores if needed |
| `localeRegistry` | Register a custom `LocaleProvider` implementation |

## Quick start

```typescript
import { locale, t } from 'aeico-localize'
import { AeicoElement } from 'aeico-element'
import { html } from 'aeico-view'

// 1. Load translations once (e.g. app entry point)
locale.update('zh-CN', {
  buttons: { save: '保存', cancel: '取消' },
  errors:  { notFound: '未找到', required: '必填' },
})

// 2. Use in any component render()
class MyForm extends AeicoElement {
  override render() {
    return html(({ div, button }) => {
      div({}, () => {
        button({ textContent: t('buttons.save', 'Save') })
        button({ textContent: t('buttons.cancel', 'Cancel') })
      })
    })
  }
}
```

`t()` called inside `render()` **automatically subscribes** the component to locale changes. When `locale.update()` is called again, all subscribed components re-render.

## `locale.update(lang, resources)`

Load a translation bundle and switch the active locale:

```typescript
// Initial load
locale.update('en-US', {
  nav:     { home: 'Home', about: 'About' },
  buttons: { save: 'Save', cancel: 'Cancel' },
})

// Switch language at runtime — all components re-render automatically
locale.update('zh-CN', {
  nav:     { home: '首页', about: '关于' },
  buttons: { save: '保存', cancel: '取消' },
})
```

## `locale.subscribe(callback)`

React to locale changes outside of a component render:

```typescript
const unsubscribe = locale.subscribe(() => {
  console.log('Locale changed to', locale.lang)
  document.documentElement.lang = locale.lang
})

// Clean up
unsubscribe()
```

## `locale.lang` and `locale.initialized`

```typescript
if (!locale.initialized) {
  // Translations haven't loaded yet
}
console.log(locale.lang) // e.g. 'zh-CN'
```

## `t()` — shorthand

`t` is bound to the global `locale` instance:

```typescript
import { t } from 'aeico-localize'

t('buttons.save')          // returns translation or key itself
t('buttons.save', 'Save')  // returns translation or fallback
```

Key notation: dot-separated path into the resources object. `t('a.b.c')` → `resources.a.b.c`.

## Custom `LocaleProvider`

Integrate an external i18n library (e.g. `i18next`) via the registry:

```typescript
import { localeRegistry } from 'aeico-localize'
import i18next from 'i18next'

localeRegistry.setProvider({
  t(key: string) {
    return i18next.t(key)
  },
  subscribe(callback: () => void) {
    i18next.on('languageChanged', callback)
    return () => i18next.off('languageChanged', callback)
  },
  get lang() { return i18next.language },
})
```

## How automatic re-render works

`t()` internally calls `getCurrentContext()` from `aeico-element` to detect the component currently executing `render()`. If a context is active, the component is added to an internal `Set`. When `locale.update()` runs, every component in the set has `.update()` called — triggering a new render cycle. Disconnected components are automatically pruned.
