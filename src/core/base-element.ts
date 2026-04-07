import type {
  Props,
  Prop,
  ComputedDeclaration,
  Watchers,
  InferProps
} from './types'
import { createEventEmitter, type ComponentEventEmitter } from './events'
import ElementBuilder from './element-builder'
import { setRenderContext, clearRenderContext } from './render-context'
import type { Updatable } from './render-context'

/**
 * BaseElement — internal reactive foundation for all Aeico elements.
 *
 * Provides:
 * - Reactive property system (static props / watchers / computed)
 * - Batched update lifecycle (onPrepare → render → onUpdated (+ onMounted*))
 * - Event system (emit / events)
 * - Custom element registration helpers (register / toKebab)
 *
 * This class is intentionally NOT exported from the public API.
 * External consumers should extend AeicoBase (no styles) or AeicoElement (with styles).
 */
class BaseElement extends HTMLElement {
  private _updatePending = false
  private _changedProps = new Map<string, unknown>()
  private _hasMounted = false
  private _computedCache = new Map<string, { deps: string; value: unknown }>()

  /**
   * Event prefix for this component.
   * @example
   * static readonly eventPrefix = 'field'  // emits 'field-change', 'field-reset'
   */
  static readonly eventPrefix: string = ''
  static readonly eventNamespace?: string

  private static _staticEvents?: Record<string, string>
  static get events() {
    if (!this._staticEvents) {
      const namespace = this.eventNamespace
      this._staticEvents = createEventEmitter(new EventTarget(), this.eventPrefix, namespace).events
    }
    
    return this._staticEvents
  }

  private _eventEmitter?: ComponentEventEmitter

  get events() {
    if (!this._eventEmitter) {
      const constructor = this.constructor as typeof BaseElement
      const namespace = constructor.eventNamespace
      this._eventEmitter = createEventEmitter(this, constructor.eventPrefix, namespace)
    }

    return this._eventEmitter.events
  }

  protected emit(eventKey: string, detail?: Record<string, unknown>): void {
    if (!this._eventEmitter) {
      const constructor = this.constructor as typeof BaseElement
      const namespace = constructor.eventNamespace
      this._eventEmitter = createEventEmitter(this, constructor.eventPrefix, namespace)
    }

    this._eventEmitter.emit(eventKey, detail)
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

  /** Static property declarations. Subclasses override to define their props. */
  static props: Props = {}

  /** Computed property declarations. Automatically cached and invalidated. */
  static computed?: ComputedDeclaration

  /** Property watcher declarations. Maps property name → method name. */
  static watchers?: Watchers

  static get observedAttributes(): string[] {
    const allProps = this._collectProps() as Props

    return Object.entries(allProps)
      .filter(([_, decl]) => decl.observe !== false)
      .map(([key, decl]) => decl.attr ?? this.toKebab(key))
  }

  private static _propertyCache?: Record<string, Prop>
  private static _attrToPropMap?: Map<string, string>

  /**
   * Collect props from the entire inheritance chain, starting from the current class up to HTMLElement.
   * Child class props override parent class props. Also builds a map of attribute names to property names for efficient lookup in attributeChangedCallback.
   * Caches the result on the class to avoid recomputation and prevent infinite loops when accessing props during initialization.
   */
  private static _collectProps(): Record<string, Prop> {
    // is very important!
    // to cache the result, otherwise it will cause infinite loop when accessing props in attributeChangedCallback
    if (Object.prototype.hasOwnProperty.call(this, '_propertyCache')) {
      return this._propertyCache!
    }

    const inheritanceStack: (typeof HTMLElement)[] = []
    let current: typeof HTMLElement | null = this as typeof HTMLElement

    // push classes in the prototype chain onto the stack until we reach HTMLElement
    while (current && current !== HTMLElement) {
      inheritanceStack.push(current)
      current = Object.getPrototypeOf(current) as typeof HTMLElement | null
    }

    const collected: Record<string, Prop> = {}

    // Pop classes from the stack and merge their props (child class props override parent class props)
    while (inheritanceStack.length > 0) {
      const cls = inheritanceStack.pop() as typeof BaseElement
      if (Object.prototype.hasOwnProperty.call(cls, 'props') && cls.props) {
        Object.assign(collected, cls.props)
      }
    }

    const attrMap = new Map<string, string>()
    for (const [propName, decl] of Object.entries(collected)) {
      if (decl.observe === false) continue

      const attrName = decl.attr ?? this.toKebab(propName)
      attrMap.set(attrName, propName)
    }

    this._propertyCache = collected
    this._attrToPropMap = attrMap

    return collected
  }

  static useShadowDOM: boolean = true
  static shadowOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true }

  private _elementBuilder?: ElementBuilder

  protected get builder(): ElementBuilder {
    return this._elementBuilder ??= new ElementBuilder()
  }

  private _building = false
  private _reflecting = false

  protected build(cb: () => void) {
    if (this._building) {
      throw new Error('Already building. Nested build calls are not allowed.')
    }

    this._building = true

    try {
      this.builder.build(this.container, cb)
    } finally {
      this._building = false
    }
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
    this._initializeProps()
    this._initializeComputed()
    
    // Call onPrepare before the first render to allow subclasses to set up initial state or cancel rendering if needed
    // no any props or attributes are set yet, so it can be used to set default values or fetch initial data before the first render
    // e.g.: <ae-component>content</ae-component>
    this.update()
  }

  /**
   * Initialize reactive props by defining getters/setters based on static `props` declaration.
   * For each property, defines a getter/setter that reads/writes an internal value and reflects to attributes if configured.
   * Also captures pre-upgrade property values (set before the element was upgraded) and re-applies them after defining accessors.
   */
  private _initializeProps() {
    const constructor = this.constructor as typeof BaseElement
    const allProps = constructor._collectProps()

    for (const [propName, propDecl] of Object.entries(allProps)) {
      const kebabName = constructor.toKebab(propName)
      const internalKey = `_${String(propName)}`
      const self = this as Record<string, unknown>

      // Capture pre-upgrade property value (set before element was upgraded)
      let preUpgradeValue: unknown
      let hasPreUpgrade = false
      if (Object.prototype.hasOwnProperty.call(this, propName)) {
        preUpgradeValue = self[propName]
        hasPreUpgrade = true
        Reflect.deleteProperty(this, propName)
      }

      self[internalKey] = undefined

      Object.defineProperty(this, propName, {
        get: () => {
          if (propDecl.observe === false) { // if observe is disabled, just return the internal value without trying to read from attribute
            return self[internalKey]
          }

          const attrName = propDecl.attr ?? kebabName
          const attrValue = this.getAttribute(attrName)
          if (attrValue === null) {
            return self[internalKey]
          }

          return this.deserializeAttribute(attrValue, propDecl)
        },
        set: (value: unknown) => {
          const oldValue = self[propName]

          if (propDecl.observe === false) { // if observe is disabled, just update the internal value without reflecting to attribute
            self[internalKey] = value
            this.update(propName, oldValue)

            return
          }

          self[internalKey] = value

          const shouldReflect = propDecl.reflect !== false
          const attrName = propDecl.attr ?? kebabName

          if (shouldReflect) {
            this._reflecting = true
            if (value === null || value === undefined) {
              this.removeAttribute(attrName)
            } else {
              const serialized = this.serializeAttribute(value, propDecl)
              this.setAttribute(attrName, serialized)
            }
            this._reflecting = false
          }

          this.update(propName, oldValue)
        },
        enumerable: true,
        configurable: true,
      })

      if (hasPreUpgrade && preUpgradeValue !== undefined) {
        self[propName] = preUpgradeValue
      }
    }
  }

  /**
   * Initialize computed props by defining getters that compute values based on dependencies and cache results.
   * Computed props are defined in the static `computed` object, where each key is a property name and the value is an object with:
   * - deps: array of dependent property names
   * - compute: function that takes the component instance and returns the computed value
   * The getter checks if the dependencies have changed since the last computation (using a cache key) and either returns the cached value or recomputes it.
   * Computed props are automatically invalidated when their dependencies change (handled in invalidateComputed).
   */
  private _initializeComputed() {
    const constructor = this.constructor as typeof BaseElement
    if (!constructor.computed) return

    for (const [computedName, config] of Object.entries(constructor.computed)) {
      Object.defineProperty(this, computedName, {
        get: () => {
          const self = this as Record<string, unknown>
          const depsKey = config.deps.map(dep => String(self[dep])).join('|')
          const cached = this._computedCache.get(computedName)
          if (cached && cached.deps === depsKey) return cached.value
          const value = config.compute(this)
          this._computedCache.set(computedName, { deps: depsKey, value })

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
  update(name?: string, oldValue?: unknown): void {
    if (name !== undefined) {
      this._changedProps.set(name, oldValue)
    }
    
    if (!this._updatePending) {
      this._updatePending = true
      queueMicrotask(() => this.executeUpdate())
    }
  }

  /**
   * Execute the update cycle: onPrepare → render → onUpdated → onMounted.
   * Called automatically after update is triggered.
   * Can be overridden to customize update behavior, but should call super.executeUpdate() if so.
   */
  protected async executeUpdate(): Promise<void> {
    const changedProps = this._changedProps
    this._changedProps = new Map<string, unknown>()
    this._updatePending = false

    const shouldUpdate = this.onPrepare(changedProps)
    if (shouldUpdate === false) return

    this.triggerWatchers(changedProps)
    this.invalidateComputed(changedProps)

    if (typeof (this as Record<string, unknown>)['render'] === 'function') {
      setRenderContext(this as unknown as Updatable)
      try {
        this.render()
      } finally {
        clearRenderContext()
      }
    }

    this.onUpdated(changedProps)

    if (!this._hasMounted) {
      this.onMounted(changedProps)
      this._hasMounted = true
    }
  }

  /**
   * Trigger property watchers based on changed props. Called during the update cycle.
   * For each changed property that has a watcher, calls the corresponding method with (newValue, oldValue).
   * @param changedProps Map of changed property names to their old values
   */
  private triggerWatchers(changedProps: Map<string, unknown>): void {
    const constructor = this.constructor as typeof BaseElement
    if (!constructor.watchers) return

    for (const [propName, oldValue] of changedProps) {
      const methodName = constructor.watchers[propName]
      const self = this as Record<string, unknown>
      if (methodName && typeof self[methodName] === 'function') {
        const newValue = self[propName]
        ;(self[methodName] as (n: unknown, o: unknown) => void)(newValue, oldValue)
      }
    }
  }

  /**
   * Invalidate cached computed props if their dependencies have changed. Called during the update cycle.
   * For each computed property, checks if any of its dependencies are in the changedProps map. If so, deletes it from the cache.
   * @param changedProps Map of changed property names to their old values
   */
  private invalidateComputed(changedProps: Map<string, unknown>): void {
    const constructor = this.constructor as typeof BaseElement
    if (!constructor.computed) return
    const changedNames = Array.from(changedProps.keys())
    for (const [computedName, config] of Object.entries(constructor.computed)) {
      if (config.deps.some(dep => changedNames.includes(dep))) {
        this._computedCache.delete(computedName)
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
  private serializeAttribute(value: unknown, propDecl: Prop): string {
    if (propDecl?.formatter) {
      return propDecl.formatter(value, propDecl.type) ?? ''
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
  private deserializeAttribute(value: string | null, propDecl: Prop): unknown {
    // if a custom parser is defined, use it
    if (propDecl?.parser) {
      return propDecl.parser(value, propDecl.type)
    }

    // Handle basic types
    if (value === null) {
      return propDecl.type === Boolean ? false : undefined; 
    }

    switch (propDecl.type) {
      case Boolean:
        // Presence of the attribute is true in Web standards (e.g. <my-el active>).
        // Explicitly setting the string "false" is treated as false for ergonomics
        // (e.g. <my-el checked="false"> → false).
        return value !== 'false'

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
   * Should contain the logic to update the component's DOM based on its props/state.
   */
  protected render(): void {}

  /**
   * Lifecycle methods to override in subclasses:
   * - onPrepare(changedProps): called before update, can return false to skip update
   * - onUpdated(changedProps): called after update
   * - onMounted(changedProps): called after the first update
   */
  protected onPrepare(_changedProps: Map<string, unknown>): boolean | void {}
  protected onUpdated(_changedProps: Map<string, unknown>): void {}
  protected onMounted(_changedProps: Map<string, unknown>): void {}

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
    if (this._reflecting) return

    const constructor = this.constructor as typeof BaseElement
    const entry = constructor._getPropertyForAttribute(name)
    if (!entry) return

    const { propName, propDecl } = entry
    const internalKey = `_${propName}`
    const self = this as Record<string, unknown>
    const prevValue = self[internalKey]
    
    self[internalKey] = this.deserializeAttribute(newValue, propDecl)
    
    this.update(propName, prevValue)
  }

  private static _getPropertyForAttribute(attrName: string): { propName: string; propDecl: Prop } | undefined {
    // ensure props are collected and cached before looking up the attribute map, since this may be called before the constructor runs
    this._collectProps()
    
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
export type BaseElementProps = InferProps<typeof BaseElement>
