# Lifecycle, styles and events

## Lifecycle order

Each update cycle runs in this sequence:

```
onPrepare(changedProps)      return false to abort the cycle
  watchers run
    render()                 return an html(...) result
      onUpdated(changedProps)
        onMounted(changedProps)   first render only
```

`changedProps` is a `Map<string, unknown>` where each key is a property name and each
value is the **old** value before the change.

## onPrepare

Called before each render cycle. Return `false` to abort the update — watchers and
`render()` will not run for this cycle.

```typescript
override onPrepare(changedProps: Map<string, unknown>): boolean | void {
  // Skip a render when only an internal flag changed
  if (changedProps.size === 1 && changedProps.has('_loading')) return false
}
```

## onUpdated

Called after every render cycle. Safe to read updated DOM measurements or dispatch events.

```typescript
override onUpdated(changedProps: Map<string, unknown>): void {
  if (changedProps.has('open')) {
    this.emit('toggle', { detail: { open: this.open } })
  }
}
```

## onMounted

Called once after the first render. The shadow DOM is fully populated at this point and
the element is guaranteed to be connected to the document.

```typescript
override onMounted(): void {
  this.queryElement<HTMLInputElement>('input')?.focus()
  this.listen(window, 'resize', this._onResize, { passive: true })
}
```

## Styles

Only available on `AeicoElement` (not `AeicoBase`).

```typescript
class MyEl extends AeicoElement {
  // Single CSS string
  static styles = `
    :host  { display: block; }
    button { padding: 4px 8px; }
  `

  // Array — items are merged in order, useful for sharing base styles
  static styles = [baseButtonStyles, `button { color: red; }`]
}
```

`AeicoElement` uses `adoptedStyleSheets` when the browser supports it, falling back to
`<style>` tag injection inside the shadow root.

## Events

### emit

Dispatches a custom event from the component. Events bubble and are composed by default.

```typescript
// Dispatch on the component itself
this.emit('change', { detail: { value: this.count } })
this.emit('close')

// Dispatch on a different target
this.emit(this.shadowRoot!, 'internal-change', { bubbles: false })
```

### listen

Adds an event listener that is automatically removed when the component disconnects.

```typescript
// Listen on the component itself
this.listen('click', this._onClick)

// Listen on an external target
this.listen(document, 'keydown', this._onKeyDown)
this.listen(window,   'resize',  this._onResize, { passive: true })
```

Do not call `listen()` inside `render()`. Use declarative event props (`onclick`, etc.)
on elements produced by `html()` instead.

## TypeScript helpers

### InferProps

Infers the public prop types from a component class:

```typescript
import type { InferProps } from 'aeico-element'

type MyElProps = InferProps<typeof MyEl>
// { count: number; label: string | undefined; disabled: boolean; ... }
```

### Prop interface

Full type for a single prop declaration:

```typescript
interface Prop<T = unknown> {
  type?:      StringConstructor | NumberConstructor | BooleanConstructor
            | ArrayConstructor  | ObjectConstructor
  reflect?:   boolean   // default: true  — reflect value to HTML attribute
  observe?:   boolean   // default: true  — react to attribute changes
  attr?:      string    // custom attribute name (default: kebab-case)
  parser?:    (value: string | null, type?: PropertyType) => T
  formatter?: (value: T, type?: PropertyType) => string | null
}
```
