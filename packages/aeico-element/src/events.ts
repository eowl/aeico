/**
 * Event system utilities for components
 * Provides listener tracking and auto-cleanup
 */

/**
 * Options for emitting a component event.
 *
 * @property detail  Arbitrary payload attached to the event, accessible via `event.detail`.
 * @property bubbles Whether the event bubbles up through the DOM. Defaults to `true`.
 * @property composed Whether the event crosses shadow DOM boundaries. Defaults to `true`.
 */
export interface EmitOptions {
  detail?: Record<string, unknown>
  bubbles?: boolean
  composed?: boolean
}

/**
 * Dispatch a CustomEvent on a target.
 *
 * @param target    The EventTarget to dispatch on (typically a component instance).
 * @param eventName The event name to dispatch.
 * @param options   Optional payload and bubbling/composed flags (both default to `true`).
 */
export function emit(target: EventTarget, eventName: string, options?: EmitOptions): void {
  target.dispatchEvent(new CustomEvent(eventName, {
    bubbles:  options?.bubbles  ?? true,
    composed: options?.composed ?? true,
    detail:   options?.detail,
  }))
}

type TrackedListener = { target: EventTarget; event: string; handler: EventListenerOrEventListenerObject }

export class ListenerRegistry {
  private _listeners: TrackedListener[] = []

  add(target: EventTarget, event: string, handler: EventListenerOrEventListenerObject): void {
    target.addEventListener(event, handler)
    this._listeners.push({ target, event, handler })
  }

  removeAll(): void {
    for (const { target, event, handler } of this._listeners) {
      target.removeEventListener(event, handler)
    }
    this._listeners.length = 0
  }
}
