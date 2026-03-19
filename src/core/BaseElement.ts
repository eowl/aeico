import type {
  Props,
  Prop,
  ComputedDeclaration,
  Watchers,
  InferProperties
} from './types'
import { createEventEmitter, type ComponentEventEmitter } from './events'
import ElementBuilder from './ElementBuilder'

/**
 * BaseElement — internal reactive foundation for all Aeico elements.
 *
 * Provides:
 * - Reactive property system (static properties / watchers / computed)
 * - Batched update lifecycle (willUpdate → render → updated → firstUpdated)
 * - Event system (emit / events)
 * - Custom element registration helpers (register / toKebab)
 *
 * This class is intentionally NOT exported from the public API.
 * External consumers should extend AeicoBase (no styles) or AeicoElement (with styles).
 */
class BaseElement extends HTMLElement {
  // Batch update system
  private updateRequested = false
  private changedProperties = new Map<string, any>()
  private isFirstUpdate = true

  // Computed properties cache
  private computedCache = new Map<string, { deps: string; value: any }>()

  /**
   * Event prefix for this component.
   * @example
   * static readonly eventPrefix = 'field'  // emits 'field-change', 'field-reset'
   */
  static readonly eventPrefix: string = ''

  private static staticEvents?: any
  static get events() {
    if (!this.staticEvents) {
      const namespace = (this as any).eventNamespace
      this.staticEvents = createEventEmitter(new EventTarget(), this.eventPrefix, namespace).events
    }
    return this.staticEvents
  }

  private eventEmitter?: ComponentEventEmitter

  get events() {
    if (!this.eventEmitter) {
      const constructor = this.constructor as typeof BaseElement
      const namespace = (constructor as any).eventNamespace
      this.eventEmitter = createEventEmitter(this, constructor.eventPrefix, namespace)
    }
    return this.eventEmitter.events
  }

  protected emit(eventKey: string, detail?: any): void {
    if (!this.eventEmitter) {
      const constructor = this.constructor as typeof BaseElement
      const namespace = (constructor as any).eventNamespace
      this.eventEmitter = createEventEmitter(this, constructor.eventPrefix, namespace)
    }
    this.eventEmitter.emit(eventKey, detail)
  }

  /**
   * Convert camelCase or PascalCase to kebab-case.
   * Strips leading underscores/numbers to ensure valid custom element names.
   * @example toKebab('MyComponent') // => 'my-component'
   */
  static toKebab(str: string): string {
    const cleaned = str.replace(/^[_\d]+/, '')

    return cleaned.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
  }

  /** Static property declarations. Subclasses override to define their properties. */
  static properties: Props = {}

  /** Computed property declarations. Automatically cached and invalidated. */
  static computed?: ComputedDeclaration

  /** Property watcher declarations. Maps property name → method name. */
  static watchers?: Watchers

  static get observedAttributes(): string[] {
    const allProps = this.collectProperties() as Props
    return Object.entries(allProps)
      .filter(([_, decl]) => decl.attribute !== false)
      .map(([key]) => this.toKebab(key))
  }

  private static collectProperties(): Record<string, Prop> {
    const collected: Record<string, Prop> = {}
    let currentClass: any = this
    while (currentClass && currentClass !== HTMLElement) {
      if (currentClass.hasOwnProperty('properties') && currentClass.properties) {
        Object.assign(collected, currentClass.properties)
      }
      currentClass = Object.getPrototypeOf(currentClass)
    }
    return collected
  }

  static useShadowDOM: boolean = true
  static shadowOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true }

  private _ElementBuilder?: ElementBuilder

  protected get tags(): ElementBuilder {
    return this._ElementBuilder ??= new ElementBuilder()
  }

  protected draw(block: () => void) {
    this.tags.build(this.shadowRoot || this, block);
  }

  protected get container(): ShadowRoot | HTMLElement {
    const ctor = this.constructor as typeof BaseElement

    return ctor.useShadowDOM ? this.shadowRoot! : this
  }

  protected replaceContent(content: Node | DocumentFragment): void {
    this.container.replaceChildren(content)
  }

  protected appendContent(content: Node | DocumentFragment): void {
    this.container.appendChild(content)
  }

  protected queryElement<T extends Element = Element>(selector: string): T | null {
    return this.container.querySelector<T>(selector)
  }

  constructor() {
    super()
    
    const ctor = this.constructor as typeof BaseElement
    if (ctor.useShadowDOM) {
      this.attachShadow(ctor.shadowOptions)
    }

    this.initializeProperties()
    this.initializeComputed()
  }

  private initializeProperties() {
    const constructor = this.constructor as typeof BaseElement
    const allProps = constructor.collectProperties()

    for (const [propName, propDecl] of Object.entries(allProps)) {
      const kebabName = constructor.toKebab(propName)
      const internalKey = `_${String(propName)}`

      // Capture pre-upgrade property value (set before element was upgraded)
      let preUpgradeValue: any = undefined
      let hasPreUpgrade = false
      if (this.hasOwnProperty(propName)) {
        preUpgradeValue = (this as any)[propName]
        hasPreUpgrade = true
        delete (this as any)[propName]
      }

      ;(this as any)[internalKey] = undefined

      Object.defineProperty(this, propName, {
        get: () => {
          if (propDecl.attribute === false) {
            return (this as any)[internalKey]
          }
          const attrName = typeof propDecl.attribute === 'string' ? propDecl.attribute : kebabName
          const attrValue = this.getAttribute(attrName)
          if (attrValue === null) {
            return (this as any)[internalKey]
          }
          return this.deserializeAttribute(attrValue, propDecl)
        },
        set: (value: any) => {
          const oldValue = (this as any)[propName]

          if (propDecl.attribute === false) {
            ;(this as any)[internalKey] = value
            this.requestUpdate(propName, oldValue)
            return
          }

          ;(this as any)[internalKey] = value

          const shouldReflect = propDecl.reflect !== false
          const attrName = typeof propDecl.attribute === 'string' ? propDecl.attribute : kebabName

          if (shouldReflect) {
            if (value === null || value === undefined) {
              this.removeAttribute(attrName)
            } else {
              const serialized = this.serializeAttribute(value, propDecl)
              this.setAttribute(attrName, serialized)
            }
          }

          this.requestUpdate(propName, oldValue)
        },
        enumerable: true,
        configurable: true,
      })

      if (hasPreUpgrade && preUpgradeValue !== undefined) {
        ;(this as any)[propName] = preUpgradeValue
      }
    }
  }

  private initializeComputed() {
    const constructor = this.constructor as typeof BaseElement
    if (!constructor.computed) return

    for (const [computedName, config] of Object.entries(constructor.computed)) {
      Object.defineProperty(this, computedName, {
        get: () => {
          const depsKey = config.deps.map(dep => String((this as any)[dep])).join('|')
          const cached = this.computedCache.get(computedName)
          if (cached && cached.deps === depsKey) return cached.value
          const value = config.compute(this)
          this.computedCache.set(computedName, { deps: depsKey, value })
          return value
        },
        enumerable: true,
        configurable: true,
      })
    }
  }

  /**
   * Request an update to the component. Can be called in property setters or manually.
   * @param name The name of the property that changed (optional, for manual calls)
   * @param oldValue The previous value of the property (optional, for manual calls)
   */
  protected requestUpdate(name?: string, oldValue?: any): void {
    if (name !== undefined) {
      this.changedProperties.set(name, oldValue)
    }
    if (!this.updateRequested) {
      this.updateRequested = true
      queueMicrotask(() => this.performUpdate())
    }
  }

  /**
   * Perform the update cycle: willUpdate → render → updated → firstUpdated.
   * Called automatically after requestUpdate is triggered.
   * Can be overridden to customize update behavior, but should call super.performUpdate() if so.
   */
  private async performUpdate(): Promise<void> {
    const changedProps = this.changedProperties
    this.changedProperties = new Map()
    this.updateRequested = false

    const shouldUpdate = this.willUpdate(changedProps)
    if (shouldUpdate === false) return

    this.triggerWatchers(changedProps)
    this.invalidateComputed(changedProps)

    if (typeof (this as any).render === 'function') {
      ;(this as any).render()
    }

    this.updated(changedProps)

    if (this.isFirstUpdate) {
      this.firstUpdated(changedProps)
      this.isFirstUpdate = false
    }
  }

  /**
   * Trigger property watchers based on changed properties. Called during the update cycle.
   * For each changed property that has a watcher, calls the corresponding method with (newValue, oldValue).
   * @param changedProps Map of changed property names to their old values
   */
  private triggerWatchers(changedProps: Map<string, any>): void {
    const constructor = this.constructor as typeof BaseElement
    if (!constructor.watchers) return
    for (const [propName, oldValue] of changedProps) {
      const methodName = constructor.watchers[propName]
      if (methodName && typeof (this as any)[methodName] === 'function') {
        const newValue = (this as any)[propName] as any
        ;(this as any)[methodName](newValue, oldValue)
      }
    }
  }

  /**
   * Invalidate cached computed properties if their dependencies have changed. Called during the update cycle.
   * For each computed property, checks if any of its dependencies are in the changedProps map. If so, deletes it from the cache.
   * @param changedProps Map of changed property names to their old values
   */
  private invalidateComputed(changedProps: Map<string, any>): void {
    const constructor = this.constructor as typeof BaseElement
    if (!constructor.computed) return
    const changedNames = Array.from(changedProps.keys())
    for (const [computedName, config] of Object.entries(constructor.computed)) {
      if (config.deps.some(dep => changedNames.includes(dep))) {
        this.computedCache.delete(computedName)
      }
    }
  }

  /**
   * Serialize a property value to a string for attribute reflection.
   * Handles custom converters and basic types (Boolean, Number, Array, Object).
   * @param value The property value to serialize
   * @param propDecl The property declaration (for type info and custom converter)
   * @return The serialized string value for the attribute
   * @example
   * ```typescript
   * serializeAttribute(true, { type: Boolean }) // => 'true'
   * serializeAttribute([1,2], { type: Array }) // => '[1,2]'
   * serializeAttribute('hello', { type: String }) // => 'hello'
   * ```
    */
  private serializeAttribute(value: any, propDecl: Prop): string {
    if (propDecl.converter?.toAttribute) {
      return propDecl.converter.toAttribute(value, propDecl.type) ?? ''
    }
    switch (propDecl.type) {
      case Boolean: return value ? 'true' : 'false'
      case Number:  return String(value)
      case Array:
      case Object:  return JSON.stringify(value)
      default:      return String(value)
    }
  }

  /**
   * Deserialize an attribute string value to the appropriate property type.
   * Handles custom converters and basic types (Boolean, Number, Array, Object).
   * @param value The attribute string value to deserialize
   * @param propDecl The property declaration (for type info and custom converter)
   * @returns The deserialized property value
   */
  private deserializeAttribute(value: string, propDecl: Prop): any {
    if (propDecl.converter?.fromAttribute) {
      return propDecl.converter.fromAttribute(value, propDecl.type)
    }
    switch (propDecl.type) {
      case Boolean: return value === 'true' || value === ''
      case Number:  return Number(value)
      case Array:
      case Object:
        try { return JSON.parse(value) } catch { return propDecl.type === Array ? [] : {} }
      default:      return value
    }
  }

  /**
   * Lifecycle methods to override in subclasses:
   * - willUpdate(changedProperties): called before update, can return false to skip update
   * - updated(changedProperties): called after update
   * - firstUpdated(changedProperties): called after the first update
   */
  protected willUpdate(_changedProperties: Map<string, any>): boolean | void {}
  protected updated(_changedProperties: Map<string, any>): void {}
  protected firstUpdated(_changedProperties: Map<string, any>): void {}

  /**
   * Standard custom element lifecycle callbacks (optional to implement):
   * - connectedCallback(): called when element is added to the DOM
   * - disconnectedCallback(): called when element is removed from the DOM
   * - attributeChangedCallback(name, oldValue, newValue): called when an observed attribute changes
   */
  connectedCallback() {}
  disconnectedCallback() {}
  attributeChangedCallback(_name: string, _oldValue: string | null, _newValue: string | null) {}

  static tagName?: string

  /**
   * Register the component as a custom element. Automatically converts class name to kebab-case for the tag name.
   * @param name Optional custom tag name. If not provided, uses the kebab-case version of the class name.
   * @example
   * ```typescript
   * class MyComponent extends BaseElement { ... }
   * MyComponent.register()  // registers as 'my-component'
   * ```
   */
  static register(name?: string) {
    const tagName = name || this.tagName || this.toKebab(this.name)

    if (!tagName || !tagName.includes('-')) {
      throw new Error(`Invalid registration: ${tagName} must contain a dash.`);
    }

    if (!customElements.get(tagName)) {
      customElements.define(tagName, this as unknown as CustomElementConstructor);
    }
  }
}

export default BaseElement
export type BaseElementProps = InferProperties<typeof BaseElement>
