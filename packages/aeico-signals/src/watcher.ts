import { frozen, setFrozen } from './context.js';
import { StateSignal, callWatchedCallback, callUnwatchedCallback } from './state.js';
import { ComputedSignal, markSignalWatched, markSignalUnwatched } from './computed.js';
import type { AnySignal } from './types.js';

export type WatcherState = 'waiting' | 'watching' | 'pending';

/**
 * Low-level primitive for building effect systems.
 * The `notify` callback fires synchronously (inside `frozen`) when a watched signal changes.
 * Must not read or write any Signal inside `notify`.
 */
export class Watcher {
  _state: WatcherState = 'waiting';
  _signals: Set<AnySignal<unknown>> = new Set();
  _notifyCallback: (this: Watcher) => void;

  constructor(notify: (this: Watcher) => void) {
    this._notifyCallback = notify;
  }

  /** Add signals to the watched set and transition to `watching`. Call with no args to re-arm. */
  watch(...signals: AnySignal<unknown>[]): void {
    if (frozen) throw new Error('Cannot call Watcher.watch inside a notify callback');

    for (const signal of signals) {
      if (!(signal instanceof StateSignal) && !(signal instanceof ComputedSignal)) {
        throw new TypeError('watch() argument is not a Signal');
      }
      if (this._signals.has(signal)) continue;

      this._signals.add(signal);

      if (signal instanceof StateSignal) {
        const wasEmpty = signal._sinks.size === 0;
        signal._sinks.add(this);
        if (wasEmpty) callWatchedCallback(signal);
      } else {
        // ComputedSignal: add the Watcher to the Computed's sinks and
        // propagate the "now watched" status up through its source graph.
        markSignalWatched(signal, this);
      }
    }

    if (this._state === 'waiting') {
      this._state = 'watching';
    }
  }

  /** Remove signals from the watched set. */
  unwatch(...signals: AnySignal<unknown>[]): void {
    if (frozen) throw new Error('Cannot call Watcher.unwatch inside a notify callback');

    for (const signal of signals) {
      if (!this._signals.has(signal)) {
        throw new TypeError('unwatch() argument is not currently watched by this Watcher');
      }

      this._signals.delete(signal);

      if (signal instanceof StateSignal) {
        signal._sinks.delete(this);
        if (signal._sinks.size === 0) callUnwatchedCallback(signal);
      } else {
        // ComputedSignal
        markSignalUnwatched(signal as ComputedSignal<unknown>, this);
      }
    }

    if (this._signals.size === 0 && this._state === 'watching') {
      this._state = 'waiting';
    }
  }

  /** Returns directly-watched Computed signals that are `dirty` or `checked`. */
  getPending(): ComputedSignal<unknown>[] {
    const pending: ComputedSignal<unknown>[] = [];
    for (const signal of this._signals) {
      if (
        signal instanceof ComputedSignal &&
        (signal._state === 'dirty' || signal._state === 'checked')
      ) {
        pending.push(signal);
      }
    }
    return pending;
  }

  static _setFrozen = setFrozen;
}
