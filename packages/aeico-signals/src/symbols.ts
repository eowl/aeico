/**
 * Shared symbols used as option-key constants in SignalOptions.
 * Extracted into their own module to break the circular import chain:
 *   state.ts / computed.ts ← subtle.ts ← watcher.ts ← state.ts
 */

/**
 * Option key: callback fired when a Signal gains its first subscriber.
 * @see SignalOptions
 */
export const watched: unique symbol = Symbol('Signal.subtle.watched');

/**
 * Option key: callback fired when a Signal loses its last subscriber.
 * @see SignalOptions
 */
export const unwatched: unique symbol = Symbol('Signal.subtle.unwatched');
