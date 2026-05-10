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
  detail?: Record<string, unknown>;
  bubbles?: boolean;
  composed?: boolean;
}

/**
 * Dispatch a CustomEvent on a target.
 *
 * @param target    The EventTarget to dispatch on (typically a component instance).
 * @param eventName The event name to dispatch.
 * @param options   Optional payload and bubbling/composed flags (both default to `true`).
 */
export function emit(target: EventTarget, eventName: string, options?: EmitOptions): void {
  target.dispatchEvent(
    new CustomEvent(eventName, {
      bubbles: options?.bubbles ?? true,
      composed: options?.composed ?? true,
      detail: options?.detail,
    }),
  );
}

type TrackedListener = {
  target: EventTarget;
  event: string;
  handler: EventListenerOrEventListenerObject;
  options?: AddEventListenerOptions;
};

export class ListenerRegistry {
  private _listeners: TrackedListener[] = [];

  add(
    target: EventTarget,
    event: string,
    handler: EventListenerOrEventListenerObject,
    options?: AddEventListenerOptions,
  ): void {
    target.addEventListener(event, handler, options);
    this._listeners.push({ target, event, handler, options });
  }

  removeAll(): void {
    for (const { target, event, handler, options } of this._listeners) {
      target.removeEventListener(event, handler, options ? { capture: options.capture } : undefined);
    }
    this._listeners.length = 0;
  }
}

const _registries = new WeakMap<object, ListenerRegistry>();

function _getRegistry(host: object): ListenerRegistry {
  let registry = _registries.get(host);
  if (!registry) {
    registry = new ListenerRegistry();
    _registries.set(host, registry);
  }
  return registry;
}

/**
 * Add a tracked event listener on behalf of `host`. All listeners registered via this function
 * can be removed at once by calling `cleanupListeners(host)`, which is called automatically by
 * BaseElement's disconnectedCallback.
 *
 * @example
 * // Listen on the host element itself
 * listen(this, 'click', handler);
 * // Listen on an external target
 * listen(this, window, 'resize', handler, { passive: true });
 */
export function listenEvent(
  host: object,
  event: string,
  handler: EventListenerOrEventListenerObject,
  options?: AddEventListenerOptions,
): void;
export function listenEvent(
  host: object,
  target: EventTarget,
  event: string,
  handler: EventListenerOrEventListenerObject,
  options?: AddEventListenerOptions,
): void;
export function listenEvent(
  host: object,
  eventOrTarget: string | EventTarget,
  handlerOrEvent: EventListenerOrEventListenerObject | string,
  maybeHandlerOrOptions?: EventListenerOrEventListenerObject | AddEventListenerOptions,
  maybeOptions?: AddEventListenerOptions,
): void {
  const registry = _getRegistry(host);
  if (typeof eventOrTarget === 'string') {
    registry.add(
      host as EventTarget,
      eventOrTarget,
      handlerOrEvent as EventListenerOrEventListenerObject,
      maybeHandlerOrOptions as AddEventListenerOptions | undefined,
    );
  } else {
    registry.add(
      eventOrTarget,
      handlerOrEvent as string,
      maybeHandlerOrOptions as EventListenerOrEventListenerObject,
      maybeOptions,
    );
  }
}

/**
 * Remove all event listeners previously registered via `listen(host, ...)` for the given host.
 * Called automatically by BaseElement's disconnectedCallback.
 */
export function cleanupListeners(host: object): void {
  const registry = _registries.get(host);
  
  if (registry) {
    registry.removeAll();
    _registries.delete(host);
  }
}
