import type { ComputedSignal } from './computed.js';

// Innermost Computed currently being evaluated (null when not inside a computation).
export let computing: ComputedSignal<unknown> | null = null;

// Disallow Signal reads/writes while a Watcher notify fires.
export let frozen = false;

export function setComputing(next: ComputedSignal<unknown> | null): ComputedSignal<unknown> | null {
  const prev = computing;
  computing = next;
  return prev;
}

export function setFrozen(next: boolean): void {
  frozen = next;
}
