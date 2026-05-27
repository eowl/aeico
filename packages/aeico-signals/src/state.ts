import { computing, frozen, setFrozen } from './context.js';
import { ErrorWrapper, type SignalOptions, type Sink } from './types.js';
import { watched as watchedSym, unwatched as unwatchedSym } from './symbols.js';
import type { ComputedSignal } from './computed.js';
import type { Watcher } from './watcher.js';

/** Read-write reactive cell. Reads inside a Computed or Watcher are auto-tracked. */
export class StateSignal<T> {
  _value: T;
  _equals: (a: T, b: T) => boolean;
  _watchedCb: ((this: object) => void) | undefined;
  _unwatchedCb: ((this: object) => void) | undefined;
  /** Watched Computeds and Watchers. Unwatched Computeds use pull-based version checks instead. */
  _sinks: Set<Sink> = new Set();
  /** Incremented on every real value change; used by pull-based staleness detection. */
  _version = 0;

  constructor(initialValue: T, options?: SignalOptions<T>) {
    this._value = initialValue;
    this._equals = options?.equals ?? Object.is;
    this._watchedCb = options?.[watchedSym] as unknown as ((this: object) => void) | undefined;
    this._unwatchedCb = options?.[unwatchedSym] as unknown as ((this: object) => void) | undefined;
  }

  /** Read the current value. Registers this State as a dependency when called inside a Computed. */
  get(): T {
    if (frozen) throw new Error('Cannot read a Signal inside a Watcher notify callback');
    if (computing !== null) {
      trackSource(this as unknown as StateSignal<unknown>, computing);
    }
    return this._value;
  }

  /** Write a new value and propagate changes to dependents. */
  set(newValue: T): void {
    if (frozen) throw new Error('Cannot write a Signal inside a Watcher notify callback');
    const changed = setSignalValue(this, newValue, false);
    if (!changed) return;
    this._version++;
    propagateAndNotify(this._sinks);
  }
}

/** Returns true if value changed (equals returned false). */
export function setSignalValue<T>(
  signal: StateSignal<T>,
  newValue: T,
  isError: boolean,
): boolean {
  if (!isError) {
    let equal: boolean;
    try {
      equal = signal._equals.call(signal, signal._value, newValue);
    } catch (e) {
      // If equals() throws, treat as changed and cache the error downstream
      signal._value = new ErrorWrapper(e) as unknown as T;
      return true;
    }
    if (equal) return false;
  }
  signal._value = newValue;
  return true;
}

/** Record source→consumer dependency. Only adds to sinks when the consumer is watched. */
export function trackSource(
  source: StateSignal<unknown> | ComputedSignal<unknown>,
  consumer: ComputedSignal<unknown>,
): void {
  consumer._sources.push(source);
  // Sink relationship only maintained for watched consumers; unwatched Computeds
  // use pull-based version checks and don't need to hold a strong reference here.
  if (consumer._sinks.size > 0 || consumer._watcherCount > 0) {
    const wasEmpty = source._sinks.size === 0;
    source._sinks.add(consumer);
    if (wasEmpty) {
      callWatchedCallback(source);
    }
  }
}

/** Mark sinks dirty and synchronously fire all Watcher notify callbacks. */
export function propagateAndNotify(sinks: Set<Sink>): void {
  const watchersToNotify: Watcher[] = [];
  markSinksDirty(sinks, /* isDirect */ true, watchersToNotify);
  notifyWatchers(watchersToNotify);
}

function markSinksDirty(
  sinks: Set<Sink>,
  isDirect: boolean,
  watchersToNotify: Watcher[],
): void {
  for (const sink of sinks) {
    if (isWatcher(sink)) {
      if (sink._state === 'watching') {
        sink._state = 'pending';
        watchersToNotify.push(sink);
      }
    } else {
      // ComputedSignal: direct deps become dirty, indirect deps become checked.
      if (sink._state === 'clean') {
        sink._state = isDirect ? 'dirty' : 'checked';
        if (sink._sinks.size > 0) {
          markSinksDirty(sink._sinks, /* isDirect */ false, watchersToNotify);
        }
      }
      // Already dirty/checked: no-op.
    }
  }
}

function notifyWatchers(watchers: Watcher[]): void {
  const errors: unknown[] = [];
  for (const watcher of watchers) {
    setFrozen(true);
    try {
      watcher._notifyCallback.call(watcher);
    } catch (e) {
      errors.push(e);
    } finally {
      setFrozen(false);
    }
    watcher._state = 'waiting';
  }
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) throw new AggregateError(errors, 'Multiple Watcher notify callbacks threw');
}

/** Type guard: distinguishes Watcher from ComputedSignal in a Sink union. */
function isWatcher(sink: Sink): sink is Watcher {
  // Watchers have a _notifyCallback; Computeds have a _callback.
  return '_notifyCallback' in sink;
}

/** Call the `watched` callback with frozen=true when a signal gains its first sink. */
export function callWatchedCallback(signal: StateSignal<unknown> | ComputedSignal<unknown>): void {
  const cb = signal._watchedCb;
  if (cb === undefined) return;
  setFrozen(true);
  try {
    cb.call(signal);
  } finally {
    setFrozen(false);
  }
}

/** Call the `unwatched` callback with frozen=true when a signal loses its last sink. */
export function callUnwatchedCallback(
  signal: StateSignal<unknown> | ComputedSignal<unknown>,
): void {
  const cb = signal._unwatchedCb;
  if (cb === undefined) return;
  setFrozen(true);
  try {
    cb.call(signal);
  } finally {
    setFrozen(false);
  }
}
