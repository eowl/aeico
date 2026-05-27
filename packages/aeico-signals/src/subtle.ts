import { computing, setComputing } from './context.js';
import { StateSignal } from './state.js';
import { ComputedSignal } from './computed.js';
import { Watcher } from './watcher.js';
import type { Source, Sink } from './types.js';

// Re-export the symbols so consumers only need to import from this module.
export { watched, unwatched } from './symbols.js';

/** Run `cb` without recording dependency reads. Untracked reads may silently become stale. */
export function untrack<T>(cb: () => T): T {
  const prev = setComputing(null);
  try {
    return cb();
  } finally {
    setComputing(prev);
  }
}

/** Returns the Computed currently being evaluated, or `null`. */
export function currentComputed(): ComputedSignal<unknown> | null {
  return computing;
}

/** Returns the ordered sources of a Computed, or the directly-watched signals of a Watcher. */
export function introspectSources<T>(
  s: ComputedSignal<T> | Watcher,
): (Source | ComputedSignal<unknown>)[] {
  if (s instanceof Watcher) {
    return [...s._signals] as (Source | ComputedSignal<unknown>)[];
  }
  return [...s._sources];
}

/** Returns the active sinks (watchers and dependent computeds) of a signal. */
export function introspectSinks<T>(s: StateSignal<T> | ComputedSignal<T>): Sink[] {
  return [...s._sinks];
}

/** `true` if the signal is currently observed by at least one Watcher. */
export function hasSinks<T>(s: StateSignal<T> | ComputedSignal<T>): boolean {
  return s._sinks.size > 0;
}

/** `true` if the signal or watcher has at least one source. */
export function hasSources<T>(s: ComputedSignal<T> | Watcher): boolean {
  if (s instanceof Watcher) {
    return s._signals.size > 0;
  }
  return s._sources.length > 0;
}
