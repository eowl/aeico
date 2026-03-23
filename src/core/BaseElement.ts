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
 * - Batched update lifecycle (onPrepare → render → onUpdated (+ onMounted*))
 * - Event system (emit / events)
 * - Custom element registration helpers (register / toKebab)
 *
 * This class is intentionally NOT exported from the public API.
 * External consumers should extend AeicoBase (no styles) or AeicoElement (with styles).
 */
class BaseElement extends HTMLElement {
  private updatePending = false
  private changedProperties = new Map<string, any>()
  private hasMounted = false

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

  private static _propertyCache?: Record<string, Prop>
  private static _attrToPropMap?: Map<string, string>

  /**
   * Collect properties from the entire inheritance chain, starting from the current class up to HTMLElement.
   * Child class properties override parent class properties. Also builds a map of attribute names to property names for efficient lookup in attributeChangedCallback.
   * Caches the result on the class to avoid recomputation and prevent infinite loops when accessing properties during initialization.
   */
  private static collectProperties(): Record<string, Prop> {
    // is very important!
    // to cache the result, otherwise it will cause infinite loop when accessing properties in attributeChangedCallback
    if (Object.prototype.hasOwnProperty.call(this, '_propertyCache')) {
      return this._propertyCache!
    }

    const inheritanceStack: any[] = []
    let current: any = this

    // push classes in the prototype chain onto the stack until we reach HTMLElement
    while (current && current !== HTMLElement) {
      inheritanceStack.push(current);
      current = Object.getPrototypeOf(current)
    }

    const collected: Record<string, Prop> = {}

    // Pop classes from the stack and merge their properties (child class properties override parent class properties)
    while (inheritanceStack.length > 0) {
      const cls = inheritanceStack.pop()
      if (Object.prototype.hasOwnProperty.call(cls, 'properties') && cls.properties) {
        Object.assign(collected, cls.properties)
      }
    }

    const attrMap = new Map<string, string>()
    for (const [propName, decl] of Object.entries(collected)) {
      if (decl.attribute === false) continue

      const attrName = typeof decl.attribute === 'string' 
        ? decl.attribute 
        : this.toKebab(propName)
      attrMap.set(attrName, propName)
    }

    this._propertyCache = collected
    this._attrToPropMap = attrMap

    return collected
  }

  static useShadowDOM: boolean = true
  static shadowOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true }

  private _ElementBuilder?: ElementBuilder

  protected get tags(): ElementBuilder {
    return this._ElementBuilder ??= new ElementBuilder()
  }

  protected build(cb: () => void) {
    this.tags.build(this.container, cb)
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

    this._initialize()
  }

  private _initialize() {
    this._initializeProperties()
    this._initializeComputed()
    
    // Call onPrepare before the first render to allow subclasses to set up initial state or cancel rendering if needed
    // no any properties or attributes are set yet, so it can be used to set default values or fetch initial data before the first render
    // e.g.: <ae-component>content</ae-component>
    this.requestUpdate()
  }

  /**
   * Initialize reactive properties by defining getters/setters based on static `properties` declaration.
   * For each property, defines a getter/setter that reads/writes an internal value and reflects to attributes if configured.
   * Also captures pre-upgrade property values (set before the element was upgraded) and re-applies them after defining accessors.
   */
  private _initializeProperties() {
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

  /**
   * Initialize computed properties by defining getters that compute values based on dependencies and cache results.
   * Computed properties are defined in the static `computed` object, where each key is a property name and the value is an object with:
   * - deps: array of dependent property names
   * - compute: function that takes the component instance and returns the computed value
   * The getter checks if the dependencies have changed since the last computation (using a cache key) and either returns the cached value or recomputes it.
   * Computed properties are automatically invalidated when their dependencies change (handled in invalidateComputed).
   */
  private _initializeComputed() {
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
    
    if (!this.updatePending) {
      this.updatePending = true
      queueMicrotask(() => this.executeUpdate())
    }
  }

  /**
   * Execute the update cycle: onPrepare → render → onUpdated → onMounted.
   * Called automatically after requestUpdate is triggered.
   * Can be overridden to customize update behavior, but should call super.executeUpdate() if so.
   */
  private async executeUpdate(): Promise<void> {
    const changedProps = this.changedProperties
    this.changedProperties = new Map()
    this.updatePending = false

    const shouldUpdate = this.onPrepare(changedProps)
    if (shouldUpdate === false) return

    this.triggerWatchers(changedProps)
    this.invalidateComputed(changedProps)

    if (typeof (this as any).render === 'function') {
      this.render()
    }

    this.onUpdated(changedProps)

    if (!this.hasMounted) {
      this.onMounted(changedProps)
      this.hasMounted = true
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
      case Boolean:
        return value ? 'true' : 'false'
      case Number:  
        return String(value)
      case Array:
      case Object:  
        return JSON.stringify(value)
      default:      
        return String(value)
    }
  }

  /**
   * Deserialize an attribute string value to the appropriate property type.
   * Handles custom converters and basic types (Boolean, Number, Array, Object).
   * @param value The attribute string value to deserialize
   * @param propDecl The property declaration (for type info and custom converter)
   * @returns The deserialized property value
   */
  private deserializeAttribute(value: string | null, propDecl: Prop): any {
    // if a custom fromAttribute converter is defined, use it
    if (propDecl.converter?.fromAttribute) {
      return propDecl.converter.fromAttribute(value, propDecl.type)
    }

    // Handle basic types
    if (value === null) {
      return propDecl.type === Boolean ? false : undefined; 
    }

    switch (propDecl.type) {
      case Boolean:
        // The existence of a unique attribute (even if it's an empty string <my-el active>) is true in Web standards
        // Only if it doesn't exist (null) is it false
        return true

      case Number:
        return value === '' ? 0 : Number(value)

      case Array:
      case Object:
        try {
          return JSON.parse(value);
        } catch {
          return propDecl.type === Array ? [] : {}
        }

      case String:
      default:
        return value
    }
  }

  /**
   * Render method to override in subclasses. Called during the update cycle after onPrepare and before onUpdated.
   * Should contain the logic to update the component's DOM based on its properties/state.
   */
  protected render(): void {}

  /**
   * Lifecycle methods to override in subclasses:
   * - onPrepare(changedProperties): called before update, can return false to skip update
   * - onUpdated(changedProperties): called after update
   * - onMounted(changedProperties): called after the first update
   */
  protected onPrepare(_changedProperties: Map<string, any>): boolean | void {}
  protected onUpdated(_changedProperties: Map<string, any>): void {}
  protected onMounted(_changedProperties: Map<string, any>): void {}

  /**
   * Standard custom element lifecycle callbacks (optional to implement):
   * - connectedCallback(): called when element is added to the DOM
   * - disconnectedCallback(): called when element is removed from the DOM
   * - attributeChangedCallback(name, oldValue, newValue): called when an observed attribute changes
   */
  connectedCallback() {}
  disconnectedCallback() {}

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    if (oldValue === newValue) return

    const constructor = this.constructor as typeof BaseElement
    const entry = constructor.getPropertyForAttribute(name)
    if (!entry) return

    const { propName, propDecl } = entry
    const internalKey = `_${propName}`
    const prevValue = (this as any)[internalKey]
    
    ;(this as any)[internalKey] = this.deserializeAttribute(newValue, propDecl)
    
    this.requestUpdate(propName, prevValue)
  }

  private static getPropertyForAttribute(attrName: string): { propName: string; propDecl: Prop } | undefined {
    // ensure properties are collected and cached before looking up the attribute map, since this may be called before the constructor runs
    this.collectProperties()
    
    const map = this._attrToPropMap as Map<string, string>
    const props = this._propertyCache as Record<string, Prop>
    
    const propName = map?.get(attrName)
    if (!propName) return undefined

    return { propName, propDecl: props[propName] }
  }

  /**
   * Custom element registration helper. Automatically converts class name to kebab-case for the tag name.
   * @param name Optional custom tag name. If not provided, uses the kebab-case version of the class name.
   */
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
