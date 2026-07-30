# aeico - Developer Architecture Guide

This document is for contributors to the aeico monorepo. It covers internal design decisions, package relationships, and how the core systems work.

## Package dependency graph

```
aeico (meta)
  ├── aeico-element   ←── aeico-view (peer)
  ├── aeico-view      (zero deps)
  ├── aeico-localize  ←── aeico-element (getCurrentContext)
  └── aeico-ssr       ←── aeico-view (getCallback) + aeico-element (types)
```

`aeico-view` has zero runtime dependencies and can be used standalone.

## Monorepo structure

```
packages/
  aeico/           Meta-package, re-exports aeico-element + aeico-view
  aeico-element/   Reactive base classes, decorators, lifecycle
  aeico-view/      DOM reconciler + html() DSL
  aeico-localize/  i18n store
  aeico-ssr/       SSR serializer
tools/             Shared test runner config (wtr-config.mjs)
benchmark/         Performance benchmarks (Vite)
```

Each package has its own `rollup.config.js`, `tsconfig.json`, and `tsconfig.build.json`.

## Build

```bash
# Build all packages (order is fixed in the root script)
npm run build

# Build a single package
npm run build -w packages/aeico-element
```

## Testing

```bash
# Run all tests (web-test-runner via WTR)
npm run test

# Watch mode for a single package
npm run test:watch -w packages/aeico-element
```

Tests run in a real browser environment via `@web/test-runner`. There is no jsdom or happy-dom - the real Custom Elements registry is exercised.

---

## aeico-view: Reconciler internals

The `Reconciler` is a cursor-based DOM builder. It maintains two parallel stacks:

- `_stack: Node[]` - ancestor nodes; the tail is the current parent
- `_cursorStack: number[]` - child-index cursor per stack level

**Build pass:**
1. `build(root, cb)` sets `root` as the initial parent and calls `cb()`
2. Tag helpers (`div(props, cb)`) call `_ensureElement(tag)` which either reuses `parentNode.childNodes[cursor]` (if it matches tag) or inserts/replaces a new element
3. Cursor advances after each element; excess children are removed at the end of each level

**Props diffing (`_applyProps`):**
- Previous props are cached in a `WeakMap<Element, Record>` per element
- Only keys whose value changed are written to the DOM
- `className` with an object value is normalized to a sorted string before comparison

**Why no virtual DOM:** The cursor approach is O(n) with rendered node count and avoids allocation of a parallel tree. It works well for components where the node count is stable across renders (most UI components).

---

## aeico-element: Reactivity system

### Property initialization

1. `_collectProps()` walks the prototype chain (child up to HTMLElement) merging `static props` and `@prop` decorator metadata stored in `Symbol.metadata`
2. `_initializePrototypeProps()` installs shared getter/setter pairs on the **prototype** (once per class, guarded by `_initializedPrototypes` WeakSet)
3. Each setter writes to `_propName` (backing field), calls `setAttribute()` for reflected props, then schedules `update()`

### Update scheduling

```
prop setter / attributeChangedCallback
  └─ update(propName, oldValue)
       └─ _changedProps.current.set(propName, oldValue)
            └─ queueMicrotask(executeUpdate)  [only once per microtask tick]
```

`SwapBuffer` is a double-buffer: `_changedProps.swap()` atomically returns and resets the current map, allowing new changes during `executeUpdate()` to queue a fresh cycle without interfering with the running one.

### Decorator metadata (TC39 Stage 3)

All decorator metadata is stored on `Symbol.metadata` (polyfilled via `Symbol.for('Symbol.metadata')` for environments that lack it). Each decorator writes to a well-known symbol key:

| Symbol key | Populated by | Read by |
|---|---|---|
| `PROP_METADATA_KEY` | `@prop` | `_collectProps()` |
| `ACCESSOR_PROPS_KEY` | `@prop` (accessor form) | `_reflectAccessorDefaults()` |
| `WATCHER_METADATA_KEY` | `@watch` | `_collectWatchers()` |
| `COMPUTED_METADATA_KEY` | `@computed` | `_collectComputed()` |

### Pre-upgrade / accessor default handling

Custom elements may be created via HTML parsing before the class is defined. In that case, JS properties set on the element before upgrade are "pre-upgrade values". `_initializeProps()` captures these and `_reflectAccessorDefaults()` re-applies them in the first microtask update (after the constructor boundary, where `setAttribute()` is safe per spec).

The `accessor` keyword triggers a TC39 `init()` callback synchronously inside the constructor. We intercept this to redirect the inline default to the backing `_propName` field rather than calling `setAttribute()` immediately (which is spec-forbidden inside the constructor).

---

## aeico-localize: Render context integration

`LocaleStore.t()` calls `getCurrentContext()` from `aeico-element` to detect the component currently executing `render()`. If a context is active, the component is added to `_components: Set<Updatable>`. When `locale.update()` runs, every component in the set has `.update()` called.

`getCurrentContext()` / `setRenderContext()` / `clearRenderContext()` use a module-level variable (not a global) - safe for concurrent SSR if each request runs in its own module scope (e.g. Edge Runtime isolates).

---

## aeico-ssr: How serialization works

`HtmlSerializer` mirrors the `Reconciler` API via a `Proxy`. The `renderHtml()` / `renderToString()` functions pass the serializer where the render callback expects a `Reconciler`. Since the SSR environment has no DOM, `HtmlSerializer` builds a string directly instead of touching real nodes.

`renderToString()` creates a plain object with `Object.create(ComponentClass.prototype)` as the render context (`this`), assigns coerced prop values, and calls the component's `render()` method. Computed properties are installed as lazy getters on the context object.

---

## Adding a new package

1. Copy an existing package directory (e.g. `aeico-localize`) as a template
2. Update `package.json`: `name`, `description`, peer/dependencies
3. Add `rollup.config.js` pointing to your entry
4. Add a `tsconfig.json` and `tsconfig.build.json`
5. No workspace registration needed - the root `package.json` already has `"workspaces": ["packages/*"]` which picks up any new directory under `packages/` automatically
6. Add a `web-test-runner.config.mjs` if the package needs browser tests
