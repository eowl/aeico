/**
 * Event system utilities for components
 * Provides dynamic event definitions and dispatching
 */

/**
 * Create dynamic event name proxy
 * Dynamically generates event names when accessed
 * 
 * @param prefix Event name prefix (e.g., 'field', 'modal', 'button')
 * @param namespace Optional event namespace (e.g., 'app', 'file')
 * @returns Proxy object that generates event names on property access
 * 
 * @example
 * const events = createEventProxy('field', '')
 * console.log(events.change) // 'field-change'
 * console.log(events.reset)  // 'field-reset'
 * 
 * const events2 = createEventProxy('', '')
 * console.log(events2.change) // 'change'
 * 
 * const events3 = createEventProxy('component', 'app')
 * console.log(events3.ready) // 'app:component-ready'
 */
function createEventProxy(
  prefix: string,
  namespace?: string
): Record<string, string> {
  return new Proxy({} as Record<string, string>, {
    get(_target, prop: string | symbol) {
      // Build event name: namespace:prefix-key or prefix-key or key
      const parts: string[] = []
      if (namespace) {
        parts.push(namespace, ':')
      }
      if (prefix) {
        parts.push(prefix, '-')
      }
      parts.push(String(prop))
      return parts.join('')
    }
  })
}

/**
 * Event emitter interface for components
 */
export type ComponentEventEmitter ={
  /**
   * Dynamic event name map
   * Access any property to get the corresponding event name
   */
  readonly events: Record<string, string>
  
  /**
   * Emit a component event
   * 
   * @param eventKey Event key (any string)
   * @param detail Optional event detail data
   * 
   * @example
   * this.emit('change', { value: 'new value' })
   */
  emit(eventKey: string, detail?: Record<string, unknown>): void
}

/**
 * Create event emitter for a component
 * 
 * @param target Event target (typically the component instance)
 * @param eventPrefix Event name prefix (default: '')
 * @param eventNamespace Optional event namespace
 * @returns Object with dynamic events map and emit method
 * 
 * @example
 * // Basic usage with prefix
 * class MyComponent extends HTMLElement {
 *   private eventEmitter = createEventEmitter(this, 'my-component')
 * 
 *   get events() { return this.eventEmitter.events }
 *   protected emit = this.eventEmitter.emit.bind(this.eventEmitter)
 * 
 *   someMethod() {
 *     this.emit('open', { source: 'button' })
 *     // Dispatches: 'my-component-open'
 *   }
 * }
 * 
 * // Without prefix
 * class SimpleComponent extends HTMLElement {
 *   private eventEmitter = createEventEmitter(this, '')
 * 
 *   someMethod() {
 *     this.emit('change')
 *     // Dispatches: 'change'
 *   }
 * }
 * 
 * // With namespace
 * class NamespacedComponent extends HTMLElement {
 *   private eventEmitter = createEventEmitter(this, 'component', 'app')
 * 
 *   someMethod() {
 *     this.emit('ready')
 *     // Dispatches: 'app:component-ready'
 *   }
 * }
 */
export function createEventEmitter(
  target: EventTarget,
  eventPrefix: string = '',
  eventNamespace?: string
): ComponentEventEmitter {
  const events = createEventProxy(eventPrefix, eventNamespace)
  
  return {
    events,
    emit(eventKey: string, detail?: Record<string, unknown>): void {
      const eventName = events[eventKey]
      target.dispatchEvent(new CustomEvent(eventName, {
        bubbles: true,
        composed: true,
        detail
      }))
    }
  }
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
