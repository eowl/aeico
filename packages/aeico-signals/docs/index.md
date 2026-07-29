# aeico-signals API Reference

`aeico-signals` is a polyfill for the [TC39 Signals proposal](https://github.com/tc39/proposal-signals) (Stage 1). It provides reactive primitives - `Signal.State`, `Signal.Computed`, and `Signal.subtle.Watcher` - that can be composed to build reactive data flows without coupling to any rendering framework.

## Architecture

```
Signal.State  --- push ->  Signal.Computed  --- push ->  Signal.subtle.Watcher
   (source)                    (derived)                       (consumer / scheduler)
```

- **State** stores a value and notifies downstream on `set()`.
- **Computed** lazily re-evaluates its callback when a dependency changes; the result is cached until stale.
- **Watcher** is a low-level scheduler handle. It fires a `notify` callback synchronously on first change and exposes `getPending()` to retrieve stale computeds for re-evaluation.

Reads inside a `Computed` callback are automatically tracked. Reads outside (or inside `untrack`) are not.

---

## `Signal.State<T>`

A read-write reactive cell.

```typescript
const count = new Signal.State(0);
count.get(); // 0
count.set(1);
count.get(); // 1
```

### Constructor

```typescript
new Signal.State<T>(initialValue: T, options?: SignalOptions<T>)
```

### Methods

| Method | Description |
|---|---|
| `get(): T` | Read the current value. Registers as a dependency when called inside a Computed. |
| `set(value: T): void` | Write a new value. Propagates to dependents if the value changed (per `equals`). |

---

## `Signal.Computed<T>`

A lazily-evaluated, cached, auto-tracking derived signal. The callback only runs when `.get()` is called and the signal is stale.

```typescript
const doubled = new Signal.Computed(() => count.get() * 2);
doubled.get(); // runs callback, caches result
doubled.get(); // returns cache (count hasn't changed)
count.set(5);
doubled.get(); // re-runs callback, yielding 10
```

### Constructor

```typescript
new Signal.Computed<T>(cb: (this: Signal.Computed<T>) => T, options?: SignalOptions<T>)
```

### Methods

| Method | Description |
|---|---|
| `get(): T` | Read the (possibly cached) value. Re-evaluates if stale. Re-throws cached errors. |

### Error handling

If the callback throws, the error is cached and re-thrown on every subsequent `get()` until a dependency changes and the callback succeeds.

```typescript
const s = new Signal.State(0);
const c = new Signal.Computed(() => {
  if (s.get() === 0) throw new Error('zero!');
  return s.get() * 10;
});

try { c.get(); } catch (e) { /* Error: zero! */ }
s.set(3);
c.get(); // 30 - error cleared
```

---

## `Signal.subtle.Watcher`

The low-level primitive for building effect systems. A `Watcher` observes a set of signals and fires its `notify` callback **synchronously** the first time any watched dependency changes (after each `watch()` call).

> **Important:** Do not read or write any Signal inside `notify`. Its only job is to schedule work - e.g. push to a queue or call `queueMicrotask`.

```typescript
const watcher = new Signal.subtle.Watcher(function notify() {
  // called synchronously when a dependency changes
  queueMicrotask(() => {
    for (const s of watcher.getPending()) s.get(); // re-evaluate stale computeds
    watcher.watch(); // re-arm for the next change
  });
});
```

### Constructor

```typescript
new Signal.subtle.Watcher(notify: (this: Watcher) => void)
```

### Methods

| Method | Description |
|---|---|
| `watch(...signals)` | Add signals to the watched set and arm the watcher. Call with no args to re-arm after a notify. |
| `unwatch(...signals)` | Remove signals from the watched set. |
| `getPending()` | Return directly-watched Computed signals that are `dirty` or `checked`. |

### Building an effect helper

```typescript
function effect(cb: () => void): () => void {
  const w = new Signal.subtle.Watcher(() => {
    queueMicrotask(() => {
      for (const s of w.getPending()) s.get();
      w.watch();
    });
  });
  const c = new Signal.Computed(cb);
  w.watch(c);
  c.get(); // initial evaluation, registers dependencies
  return () => w.unwatch(c);
}
```

---

## `Signal.subtle` utilities

### `untrack(cb)`

Run `cb` without registering any dependency reads.

```typescript
Signal.subtle.untrack(() => {
  console.log(someSignal.get()); // read without tracking
});
```

> Use only when you are certain that the untracked reads will not affect correctness.

### `currentComputed()`

Returns the `Signal.Computed` currently being evaluated, or `null`.

```typescript
const c = new Signal.Computed(() => {
  Signal.subtle.currentComputed() === c; // true
  return 42;
});
```

### `introspectSources(signal)`

Returns the dependencies of a `Signal.Computed`, or the directly-watched signals of a `Watcher`.

```typescript
const a = new Signal.State(1);
const b = new Signal.Computed(() => a.get() + 1);
b.get();
Signal.subtle.introspectSources(b); // [a]
```

### `introspectSinks(signal)`

Returns the active consumers (Computeds and Watchers) currently watching a State or Computed.

### `hasSinks(signal)`

`true` if the signal is currently observed by at least one `Watcher` (directly or transitively).

### `hasSources(signal)`

`true` if the Computed or Watcher has at least one source.

---

## `SignalOptions<T>`

Both `Signal.State` and `Signal.Computed` accept an optional options object:

```typescript
interface SignalOptions<T> {
  equals?: (this: Signal.State<T> | Signal.Computed<T>, a: T, b: T) => boolean;
  [Signal.subtle.watched]?: (this: Signal.State<T> | Signal.Computed<T>) => void;
  [Signal.subtle.unwatched]?: (this: Signal.State<T> | Signal.Computed<T>) => void;
}
```

| Option | Description |
|---|---|
| `equals` | Custom equality function. Called on `set()` / after Computed re-evaluation. Return `true` to suppress propagation. Defaults to `Object.is`. |
| `[Signal.subtle.watched]` | Called (with `frozen=true`) when this signal gains its first subscriber. |
| `[Signal.subtle.unwatched]` | Called (with `frozen=true`) when this signal loses its last subscriber. |

### Example: lazy resource

```typescript
import { Signal } from 'aeico-signals';
const { watched, unwatched } = Signal.subtle;

function lazyInterval(ms: number) {
  const tick = new Signal.State(0, {
    [watched]() { this._timer = setInterval(() => tick.set(tick.get() + 1), ms); },
    [unwatched]() { clearInterval((this as any)._timer); },
  });
  return tick;
}
```

---

## Conformance

This package targets the [TC39 Signals proposal](https://github.com/tc39/proposal-signals) at Stage 1. The API shape matches the proposal's polyfill reference implementation. As the proposal evolves the API may change.
