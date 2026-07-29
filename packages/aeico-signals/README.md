# aeico-signals

TC39 Signals (Stage 1 proposal) polyfill for the [Aeico](https://github.com/eowl/aeico) ecosystem.

Zero runtime dependencies. Works in any modern JavaScript environment.

## Installation

```bash
npm install aeico-signals
```

## Quick start

```typescript
import { Signal } from 'aeico-signals';

const count = new Signal.State(0);
const doubled = new Signal.Computed(() => count.get() * 2);

console.log(doubled.get()); // 0
count.set(3);
console.log(doubled.get()); // 6
```

## Building effects

A `Watcher` is the primitive for running side effects in response to signal changes. It fires its `notify` callback synchronously on the first change after each `watch()` call - use it to _schedule_ work, not to do it:

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
  c.get(); // initial evaluation
  return () => w.unwatch(c);
}

// Usage
const name = new Signal.State('World');
const stop = effect(() => console.log(`Hello, ${name.get()}!`));
// logs: Hello, World!
name.set('世界');
// logs (on next microtask): Hello, 世界!
stop();
```

## API overview

| Symbol | Description |
|---|---|
| `Signal.State<T>` | Read-write reactive value |
| `Signal.Computed<T>` | Lazily-evaluated derived value |
| `Signal.subtle.Watcher` | Effect scheduler primitive |
| `Signal.subtle.untrack(cb)` | Run `cb` without tracking reads |
| `Signal.subtle.currentComputed()` | The Computed currently evaluating |
| `Signal.subtle.introspectSources(s)` | Dependencies of a Computed / Watcher |
| `Signal.subtle.introspectSinks(s)` | Active consumers of a State / Computed |
| `Signal.subtle.hasSinks(s)` | Whether a signal is currently watched |
| `Signal.subtle.hasSources(s)` | Whether a signal has any dependencies |
| `Signal.subtle.watched` | Option key: callback on first subscriber |
| `Signal.subtle.unwatched` | Option key: callback on last unsubscribe |

See [docs/index.md](docs/index.md) for the full API reference.
