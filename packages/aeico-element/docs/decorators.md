# Decorators

Aeico uses TC39 Stage 3 decorators. All three decorators also have a static class field
equivalent for environments where decorators are unavailable.

## @prop - Reactive property

Declares a reactive property that triggers a batched re-render when its value changes.
By default the value is reflected to an HTML attribute and attribute changes are observed.

```typescript
import { AeicoElement, prop } from 'aeico-element'

class MyEl extends AeicoElement {
  // Minimal - type inferred from TypeScript, reflects to `label` attribute
  @prop accessor label: string | undefined

  // With explicit type constructor
  @prop({ type: Number }) accessor count = 0

  // Boolean: reflects as attribute presence (<my-el disabled>)
  @prop({ type: Boolean }) accessor disabled = false

  // Custom attribute name (default is kebab-case of the property name)
  @prop({ type: Number, attr: 'max-val' }) accessor maxVal = 100

  // JS-only state - not reflected to or observed from an attribute
  @prop({ reflect: false, observe: false }) accessor _draft = ''

  // Custom serialiser and deserialiser
  @prop({
    type: String,
    parser:    (raw) => raw?.toUpperCase() ?? '',
    formatter: (val) => val.toLowerCase(),
  }) accessor code = ''
}
```

### accessor vs field form

`@prop accessor count = 0`
- Supports an inline default value.
- The default is reflected to the attribute on the first render cycle.

`@prop count?: number`
- Simpler syntax, no `accessor` keyword.
- Inline defaults are not reflected; set initial values in `onPrepare` if needed.

`accessor` declarations do not support the `?` optional modifier. Use `T | undefined` instead:

```typescript
@prop accessor label: string | undefined   // correct
@prop accessor label?: string              // TypeScript error
```

### Prop options

| Option | Type | Default | Description |
|---|---|---|---|
| `type` | `String`, `Number`, `Boolean`, `Array`, or `Object` constructor | inferred | Constructor used for attribute deserialisation |
| `reflect` | `boolean` | `true` | Reflect the JS value to the HTML attribute |
| `observe` | `boolean` | `true` | React to attribute changes from HTML or `setAttribute()` |
| `attr` | `string` | kebab-case of property name | Custom HTML attribute name |
| `parser` | `(raw: string \| null, type?) => T` | - | Custom attribute-to-value converter |
| `formatter` | `(val: T, type?) => string \| null` | - | Custom value-to-attribute converter |

## @watch - Property observer

Registers a method to be called with `(newValue, oldValue)` whenever any of the listed
properties change. The method is called before `render()` in the same update cycle.

```typescript
import { watch } from 'aeico-element'

class MyEl extends AeicoElement {
  @prop({ type: Number }) accessor count = 0
  @prop({ type: Number }) accessor min   = 0
  @prop({ type: Number }) accessor max   = 100

  // Observe a single prop
  @watch('count')
  onCountChange(newValue: number, oldValue: number) {
    console.log(`${oldValue} -> ${newValue}`)
  }

  // Observe multiple props - called when any one of them changes.
  // newValue / oldValue refer to the specific prop that triggered the call.
  @watch('min', 'max')
  onRangeChange(newValue: number, oldValue: number) {
    this._validate()
  }
}
```

## @computed - Cached computed property

Applied to a getter. The return value is cached and recomputed only when one of the
declared dependency props changes.

```typescript
import { computed } from 'aeico-element'

class MyEl extends AeicoElement {
  @prop({ type: Number }) accessor price = 0
  @prop({ type: Number }) accessor qty   = 1
  @prop accessor firstName: string | undefined
  @prop accessor lastName:  string | undefined

  // Recomputed only when `price` or `qty` changes
  @computed('price', 'qty')
  get total() {
    return this.price * this.qty
  }

  // Computed from multiple string props
  @computed('firstName', 'lastName')
  get fullName() {
    return `${this.firstName ?? ''} ${this.lastName ?? ''}`.trim()
  }
}
```

## Static configuration (without decorators)

Equivalent to the decorator API using plain static class fields. Useful when the build
pipeline does not support TC39 Stage 3 decorators.

```typescript
class MyEl extends AeicoElement {
  declare count:   number
  declare doubled: number

  static props = {
    count: { type: Number },
    label: { type: String },
  }

  static computed = {
    doubled: {
      deps: ['count'],
      compute: (self: MyEl) => self.count * 2,
    },
  }

  static watchers = {
    // Method name string
    count: 'onCountChange',
    // Inline function
    label: (next: unknown, prev: unknown) => console.log(next, prev),
  }

  onCountChange(next: number, prev: number) {
    console.log(next, prev)
  }
}
```

Static config and decorators can be mixed on the same class. Decorator metadata is merged
with static declarations; child class values take priority over parent class values.
