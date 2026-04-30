/**
 * Render Context — generic "who is rendering" tracking.
 *
 * During a component's render cycle, the current component is stored
 * as the render context. Any reactive source (locale, theme, config…)
 * can call `getCurrentContext()` to discover which component is reading
 * it, and subscribe that component to future changes.
 *
 * This module is intentionally minimal — it only tracks the context.
 * Subscription management is the responsibility of each consumer.
 */

/**
 * Minimal contract for a component that can be scheduled for re-render.
 */
export interface Updatable {
  update(): void
  isConnected: boolean
}

let _current: Updatable | null = null

export function setRenderContext(ctx: Updatable): void {
  _current = ctx
}

export function clearRenderContext(): void {
  _current = null
}

export function getCurrentContext(): Updatable | null {
  return _current
}
