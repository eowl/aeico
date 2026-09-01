# Prop syntax reference

All props are passed as a plain object to any tag helper inside an `html()` callback.

## className

```typescript
// Static string
div({ className: 'card' })
div({ className: 'card active selected' })

// Conditional map - keys whose value is truthy are included, joined with a space
div({ className: { card: true, active: isActive, disabled: isDisabled } })
```

Mixed string and map on the same element is not supported; use one form per element.

## textContent

```typescript
span({ textContent: 'Hello world' })
span({ textContent: String(this.count) })
```

## innerHTML

Sets the `innerHTML` of an element directly. Use with caution — no sanitization is performed:

```typescript
div({ innerHTML: '<strong>Bold text</strong>' })
```

## style

Style values are a plain object with camelCase CSS property names:

```typescript
div({ style: { color: 'red' } })

div({ style: {
  backgroundColor: '#eee',
  fontSize:        '14px',
  borderRadius:    '4px',
  display:         'flex',
  alignItems:      'center',
} })
```

## id, part, role

```typescript
div({ id: 'main', part: 'container', role: 'region' })
```

## HTML attributes

Any property that maps to a standard HTML attribute can be passed directly:

```typescript
input({
  type:     'number',
  min:      '0',
  max:      '100',
  value:    String(val),
  disabled: true,
  required: true,
})

a({ href: '/home', target: '_blank', rel: 'noopener noreferrer' })

img({ src: '/logo.png', alt: 'Logo', width: '48', height: '48' })
```

## Event handlers

Event handlers are bound via `addEventListener`, declared with an `@` prefix
followed by the standard DOM event name (**without** the `on` prefix):

```typescript
button({ '@click': handleClick, textContent: 'Submit' })

input({
  '@input': (e) => (this.value = (e.target as HTMLInputElement).value),
  '@focus': () => (this.focused = true),
  '@blur':  () => (this.focused = false),
})

div({
  '@mouseenter': () => (this.hovered = true),
  '@mouseleave': () => (this.hovered = false),
})
```

Do **not** pass a function to a bare `onclick` / `oninput` prop - without the
`@` prefix a function value falls through to `setAttribute` and is stringified,
so the handler silently never fires.

For managed listeners that auto-clean up on component disconnect, use `this.listen()`
from inside lifecycle hooks (`onMounted`, `onUpdated`) instead.

## Children callback

Pass a function as the second argument to nest child elements:

```typescript
div({ className: 'wrapper' }, () => {
  header({}, () => {
    h1({ textContent: 'Title' })
  })
  main({ id: 'content' }, () => {
    p({ textContent: 'Body text' })
  })
})

// When no props are needed, the callback can be the first argument
ul(() => {
  items.forEach(item => li({ textContent: item.label }))
})
```

## SVG

SVG elements are supported by name. The reconciler switches to the SVG namespace
automatically for known SVG-only tags:

```typescript
html(({ svg, circle, path, rect, line }) => {
  svg({ viewBox: '0 0 24 24', width: '24', height: '24' }, () => {
    circle({ cx: '12', cy: '12', r: '10', fill: 'currentColor' })
    path({ d: 'M5 12 L19 12', stroke: 'white', strokeWidth: '2' })
  })
})
```

## Custom elements

Custom element tag names (containing a hyphen) are accessible as camelCase helpers.
The camelCase-to-kebab conversion is handled by both the type system and the runtime:

```typescript
html(({ myCounter, uiButton, appHeader }) => {
  appHeader({ title: 'My App' })
  myCounter({ count: 5 })
  uiButton({ label: 'Submit', disabled: true })
})
// Renders: <app-header title="My App">, <my-counter count="5">, <ui-button label="Submit" disabled>
```
