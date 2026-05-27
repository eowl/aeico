import { StateSignal } from './state.js';
import { ComputedSignal } from './computed.js';
import { Watcher } from './watcher.js';
import {
  watched,
  unwatched,
  untrack,
  currentComputed,
  introspectSources,
  introspectSinks,
  hasSinks,
  hasSources,
} from './subtle.js';
import type { SignalOptions } from './types.js';

// Re-export types for consumers.
export type { SignalOptions, AnySignal } from './types.js';
export type { ComputedState } from './computed.js';
export type { WatcherState } from './watcher.js';

/**
 * Entry point for the TC39 Signals API (Stage 1 proposal).
 * See https://github.com/tc39/proposal-signals
 */
export const Signal = {
  State: StateSignal as {
    new <T>(initialValue: T, options?: SignalOptions<T>): StateSignal<T>;
  },

  Computed: ComputedSignal as {
    new <T>(cb: (this: ComputedSignal<T>) => T, options?: SignalOptions<T>): ComputedSignal<T>;
  },

  /** Advanced APIs for framework/library authors. Use with care. */
  subtle: {
    Watcher,
    untrack,
    currentComputed,
    introspectSources,
    introspectSinks,
    hasSinks,
    hasSources,
    watched,
    unwatched,
  },
} as const;

export { StateSignal, ComputedSignal, Watcher };
export { watched, unwatched, untrack, currentComputed, introspectSources, introspectSinks, hasSinks, hasSources };

export namespace Signal {
  export type State<T> = StateSignal<T>;
  export type Computed<T> = ComputedSignal<T>;
  export namespace subtle {
    export type Watcher = import('./watcher.js').Watcher;
  }
}
