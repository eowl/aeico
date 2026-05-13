# aeico-element

Reactive element base classes and decorators for [Aeico](https://github.com/eowl/aeico).

Provides `AeicoElement` / `AeicoBase`, reactive `@prop` / `@watch` / `@computed` decorators, stylesheet management.

## Installation

```bash
npm install aeico-element
```

> `aeico-view` is installed automatically as a dependency.

## Usage

### Define a custom element

```typescript
import { AeicoElement, prop, watch } from 'aeico-element';
import { html } from 'aeico-view';

class MyCounter extends AeicoElement {
  @prop() accessor count = 0;

  @watch('count')
  onCountChange(next: number, prev: number) {
    console.log(`${prev} → ${next}`);
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

### `@computed` accessor

```typescript
import { computed } from 'aeico-element';

class MyElement extends AeicoElement {
  @prop() accessor firstName = '';
  @prop() accessor lastName = '';

  @computed('firstName', 'lastName')
  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }
}
```

### Stylesheets

```typescript
import { AeicoElement, StyleResult } from 'aeico-element';

class MyCounter extends AeicoElement {
  static styles = new StyleResult(`:host { display: block; } button { margin: 4px; }`);
}
```

### Without decorators

When decorators are unavailable, use static `props` / `watchers` / `computed` class fields:

```typescript
import { AeicoElement } from 'aeico-element';

class MyCounter extends AeicoElement {
  declare count: number;

  static props = {
    count: { type: Number },
  };

  static watchers = {
    count: 'onCountChange',
  };

  static computed = {
    doubled: {
      deps: ['count'],
      compute: (self) => self.count * 2,
    },
  };

  onCountChange(next, prev) {
    console.log(`${prev} → ${next}`);
  }

  override render() {
    return html(({ span }) => {
      span({ textContent: String(this.count) });
    });
  }
}

MyCounter.register('my-counter');
```

### Using `html()` from aeico-view

`html()` accepts a callback that receives a `Reconciler` — tag functions return the actual DOM element directly, so you can capture references without `querySelector`. You can also split the template across multiple methods:

```typescript
import { AeicoElement } from 'aeico-element';
import { html, tags } from 'aeico-view';

class MyForm extends AeicoElement {
  @prop() accessor value = '';

  private _input!: HTMLInputElement;
  private _submit!: HTMLButtonElement;

  override render() {
    return html(({ form }) => {
      form({ className: 'form' }, () => {
        this._renderInput();
        this._renderActions();
      });
    });
  }

  private _renderInput() {
    const { label, input } = tags;
    label({ textContent: 'Name' });
    // tag functions return the element directly — no querySelector needed
    this._input = input({
      type: 'text',
      value: this.value,
      oninput: (e: Event) => {
        this.value = (e.target as HTMLInputElement).value;
      },
    });
  }

  private _renderActions() {
    const { div, button } = tags;
    div({ className: 'actions' }, () => {
      this._submit = button({
        type: 'submit',
        textContent: 'Submit',
        onclick: () => this._onSubmit(),
      });
    });
  }

  private _onSubmit() {
    // this._input and this._submit are live element references
    this._submit.disabled = true;
    console.log(this._input.value);
  }
}
```

## API

| Export | Description |
|---|---|
| `AeicoElement` | Full reactive element — props, rendering, styles, events |
| `AeicoBase` | Minimal base without rendering helpers |
| `prop` | Decorator to declare a reactive property |
| `watch` | Decorator to watch a reactive property for changes |
| `computed` | Decorator for a derived (memoised) accessor; takes dependency names as arguments |
| `styleStore` | Global stylesheet store |
| `StyleResult` | Class wrapping CSS text; used for component stylesheets |
| `supportAdoptStyle` | Whether `adoptedStyleSheets` is supported in the current environment |
| `listenEvent` | Attach a tracked event listener (auto-cleaned up on disconnect) |
| `cleanupListeners` | Manually clean up all tracked listeners on an element |
| `getCurrentContext` | Returns the current render context |

## License

ISC
