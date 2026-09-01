import type { Renderable } from 'aeico-view';

/**
 * Double-buffer swap utility. Keeps two instances of a clearable object and alternates between
 * them on each swap(), so the caller never allocates a new object per cycle.
 *
 * Usage:
 * ```ts
 * const buf = new SwapBuffer(() => new Map<string, unknown>())
 * buf.current.set('key', value)   // write to active buffer
 * const snapshot = buf.swap()     // snapshot = previous active (full data)
 *                                 // buf.current is now the old pool, cleared and ready
 * ```
 */
export class SwapBuffer<T extends { clear(): void }> {
  private _active: T;
  private _pool: T;

  constructor(factory: () => T) {
    this._active = factory();
    this._pool = factory();
  }

  /** The currently active buffer. Write new entries here. */
  get current(): T {
    return this._active;
  }

  /**
   * Rotate buffers: returns the current active buffer (with accumulated data),
   * swaps in the pool buffer (cleared), and recycles the old active into the pool.
   * Zero heap allocations per call.
   */
  swap(): T {
    const prev = this._active;
    this._active = this._pool;
    this._active.clear(); // Clear the new active buffer before use
    this._pool = prev; // Recycle the old active buffer into the pool for next time

    return prev;
  }
}

export function isRenderable(value: unknown): value is Renderable {
  return !!value && typeof value === 'object' && typeof (value as Renderable)._cb === 'function';
}

/**
 * Convert camelCase or PascalCase to kebab-case.
 * Strips leading underscores/numbers to ensure valid custom element names.
 * @example toKebab('MyComponent') // => 'my-component'
 */
export function toKebab(str: string): string {
  const cleaned = str.replace(/^[_\d]+/, '');

  return cleaned.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}
