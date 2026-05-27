import { computing, frozen, setComputing } from './context';
import { ErrorWrapper, type SignalOptions, type Sink, type Source } from './types';
import { watched as watchedSym, unwatched as unwatchedSym } from './symbols';
import { trackSource, callWatchedCallback, callUnwatchedCallback } from './state';
import type { Watcher } from './watcher';

/** The four lifecycle states of a Computed signal. */
export type ComputedState = 'dirty' | 'checked' | 'computing' | 'clean';

/** Lazily-evaluated, cached, auto-tracking derived signal. */
export class ComputedSignal<T> {
  _value: T | ErrorWrapper = new ErrorWrapper(undefined); // ~uninitialized~
  _state: ComputedState = 'dirty';
  _sources: Source[] = [];
  _sinks: Set<Sink> = new Set();

  _equals: (a: T, b: T) => boolean;
  _callback: (this: ComputedSignal<T>) => T;
  _watchedCb: ((this: object) => void) | undefined;
  _unwatchedCb: ((this: object) => void) | undefined;

  _watcherCount = 0;
  _version = 0;
  _sourceVersions: number[] = [];

  constructor(cb: (this: ComputedSignal<T>) => T, options?: SignalOptions<T>) {
    this._callback = cb;
    this._equals = options?.equals ?? Object.is;
    this._watchedCb = options?.[watchedSym] as unknown as ((this: object) => void) | undefined;
    this._unwatchedCb = options?.[unwatchedSym] as unknown as ((this: object) => void) | undefined;
  }

  /** Read the current (possibly cached) value. Re-evaluates if stale; re-throws cached errors. */
  get(): T {
    if (frozen) throw new Error('Cannot read a Signal inside a Watcher notify callback');
    if (this._state === 'computing') {
      throw new Error('Cycle detected: Computed Signal accessed recursively');
    }

    if (computing !== null) {
      trackSource(this as unknown as ComputedSignal<unknown>, computing);
    }

    if (this._state === 'clean' && this._sinks.size === 0 && this._sources.length > 0) {
      const prev = setComputing(null);
      try {
        (this as unknown as ComputedSignal<unknown>)._checkStaleness();
      } finally {
        setComputing(prev);
      }
    }

    if (this._state === 'dirty' || this._state === 'checked') {
      (this as unknown as ComputedSignal<unknown>)._ensureClean();
    }

    const v = this._value;
    if (v instanceof ErrorWrapper) throw v.value;
    return v;
  }

  _checkStaleness(): void {
    for (let i = 0; i < this._sources.length; i++) {
      const src = this._sources[i];
      if (src instanceof ComputedSignal) {
        src._ensureUpToDate();
      }
      if (src._version !== this._sourceVersions[i]) {
        this._state = 'dirty';
        return;
      }
    }
  }

  _ensureUpToDate(): void {
    if (this._sinks.size > 0) return; // push-based propagation handles watched ones
    if (this._state === 'clean' && this._sources.length > 0) {
      this._checkStaleness();
    }
    if (this._state === 'dirty' || this._state === 'checked') {
      this._ensureClean();
    }
  }

  _ensureClean(): void {
    while (this._state === 'dirty' || this._state === 'checked') {
      const target = findDeepestDirty(this as unknown as ComputedSignal<unknown>);
      recalculate(target);
    }
  }
}

/** Walk source tree depth-first to find the deepest dirty Computed (bottom-up evaluation order). */
function findDeepestDirty(node: ComputedSignal<unknown>): ComputedSignal<unknown> {
  for (const src of node._sources) {
    if (!(src instanceof ComputedSignal)) continue;
    if (src._state === 'clean') continue;
    return findDeepestDirty(src);
  }
  return node;
}

/** Re-evaluate one Computed node and propagate the result. */
function recalculate(node: ComputedSignal<unknown>): void {
  const wasWatched = node._sinks.size > 0;

  detachSources(node, wasWatched);

  const prevComputing = setComputing(node);
  node._state = 'computing';

  let newValue: unknown;
  let threw = false;
  try {
    newValue = node._callback.call(node);
  } catch (e) {
    threw = true;
    newValue = e;
  } finally {
    setComputing(prevComputing);
  }

  if (wasWatched) {
    for (const src of node._sources) {
      const wasEmpty = src._sinks.size === 0;
      src._sinks.add(node);
      if (wasEmpty) {
        callWatchedCallback(src);
      }
    }
  }

  const oldValue = node._value;
  let changed: boolean;

  if (threw) {
    const wrapped = new ErrorWrapper(newValue);
    changed = !(oldValue instanceof ErrorWrapper) || oldValue.value !== newValue;
    node._value = wrapped;
  } else {
    let equal: boolean;
    try {
      equal =
        oldValue instanceof ErrorWrapper
          ? false
          : node._equals.call(node, oldValue as never, newValue as never);
    } catch (e) {
      node._value = new ErrorWrapper(e);
      node._state = 'clean';
      node._version++;
      node._sourceVersions = node._sources.map((src) => src._version);
      propagateDirtyToSinks(node._sinks);
      return;
    }
    changed = !equal;
    if (changed) {
      node._value = newValue;
    }
  }

  node._state = 'clean';
  node._sourceVersions = node._sources.map((src) => src._version);

  if (changed) {
    node._version++;
    propagateDirtyToSinks(node._sinks);
  } else {
    promoteCheckedSinks(node._sinks);
  }
}

/** Remove node from all its sources' sinks, then clear the sources list. */
function detachSources(node: ComputedSignal<unknown>, wasWatched: boolean): void {
  for (const src of node._sources) {
    src._sinks.delete(node);
    if (wasWatched && src._sinks.size === 0) {
      callUnwatchedCallback(src);
      if (src instanceof ComputedSignal) {
        detachSources(src, /* wasWatched */ true);
      }
    }
  }
  node._sources = [];
}

/** Mark all Computed sinks as `dirty` after a value change. */
function propagateDirtyToSinks(sinks: Set<Sink>): void {
  for (const sink of sinks) {
    if (sink instanceof ComputedSignal) {
      if (sink._state === 'checked' || sink._state === 'clean') {
        sink._state = 'dirty';
        propagateDirtyToSinks(sink._sinks);
      }
    }
    // Watchers are already `pending` from the original State.set() call.
  }
}

/** Promote `checked` sinks to `clean` when all their immediate sources are now clean. */
function promoteCheckedSinks(sinks: Set<Sink>): void {
  for (const sink of sinks) {
    if (!(sink instanceof ComputedSignal)) continue;
    if (sink._state !== 'checked') continue;

    let allClean = true;
    for (const src of sink._sources) {
      if (src instanceof ComputedSignal && src._state !== 'clean') {
        allClean = false;
        break;
      }
    }
    if (allClean) {
      sink._state = 'clean';
      promoteCheckedSinks(sink._sinks);
    }
  }
}

/** Propagate watched status up through the source graph when a Watcher starts watching. */
export function markSignalWatched(signal: ComputedSignal<unknown>, watcher: Watcher): void {
  const wasEmpty = signal._sinks.size === 0;
  signal._sinks.add(watcher);
  signal._watcherCount++;

  if (wasEmpty) {
    callWatchedCallback(signal);
    for (const src of signal._sources) {
      if (src instanceof ComputedSignal) {
        markSignalWatched(src, watcher);
      } else {
        const srcWasEmpty = src._sinks.size === 0;
        src._sinks.add(signal);
        if (srcWasEmpty) callWatchedCallback(src);
      }
    }
  }
}

/** Propagate unwatched status up through the source graph when a Watcher stops watching. */
export function markSignalUnwatched(signal: ComputedSignal<unknown>, watcher: Watcher): void {
  signal._sinks.delete(watcher);
  signal._watcherCount = Math.max(0, signal._watcherCount - 1);

  if (signal._sinks.size === 0) {
    callUnwatchedCallback(signal);
    for (const src of signal._sources) {
      if (src instanceof ComputedSignal) {
        markSignalUnwatched(src, watcher);
      } else {
        src._sinks.delete(signal);
        if (src._sinks.size === 0) callUnwatchedCallback(src);
      }
    }
  }
}
