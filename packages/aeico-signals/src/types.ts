import type { StateSignal } from './state.js';
import type { ComputedSignal } from './computed.js';
import type { Watcher } from './watcher.js';
import type { watched as watchedSym, unwatched as unwatchedSym } from './symbols.js';

/** Any readable Signal - the common interface for State and Computed. */
export interface AnySignal<T> {
  get(): T;
}

/** Options accepted by Signal.State and Signal.Computed constructors. */
export interface SignalOptions<T> {
  /** Custom equality function; defaults to `Object.is`. Returning `true` suppresses propagation. */
  equals?: (this: AnySignal<T>, a: T, b: T) => boolean;

  /** Called when this Signal gains its first subscriber. Runs with `frozen=true`. */
  [watchedSym]?: (this: AnySignal<T>) => void;

  /** Called when this Signal loses its last subscriber. Runs with `frozen=true`. */
  [unwatchedSym]?: (this: AnySignal<T>) => void;
}

/** Sentinel wrapping a thrown exception stored as a computed value. */
export class ErrorWrapper {
  constructor(public readonly value: unknown) {}
}

/** Anything that can be a downstream consumer of a Signal: a Computed or a Watcher. */
export type Sink = ComputedSignal<unknown> | Watcher;

/** Anything that can be a dependency of a Computed: a State or another Computed. */
export type Source = StateSignal<unknown> | ComputedSignal<unknown>;
