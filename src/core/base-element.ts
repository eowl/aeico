import type {
  Props,
  Prop,
  Computed,
  Watchers,
  WatcherHandler,
  InferProps
} from './types'
import { ListenerRegistry, emit as emitEvent, type EmitOptions } from './events'
import { setRenderContext, clearRenderContext, getCurrentContext } from './render-context'
import { html, render, type RenderResult } from '../view'
import { PROP_METADATA_KEY, ACCESSOR_PROPS_KEY } from '../decorators'
import { WATCHER_METADATA_KEY } from '../decorators/watch'
import { COMPUTED_METADATA_KEY } from '../decorators/computed'
import type { Updatable } from './render-context'
import { toKebab } from './utils'

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

  /** Static property declarations. Subclasses override to define their props. */
  static props: Props = {}

  /** Computed property declarations. Automatically cached and invalidated. */
  static computed?: Computed

  /** Property watcher declarations. Maps property name → method name. */
  static watchers?: Watchers

  static get observedAttributes(): string[] {
    const allProps = this._collectProps()

    return Object.entries(allProps).reduce<string[]>((acc, [key, decl]) => {
      if (decl.observe !== false) acc.push(decl.attr ?? toKebab(key))
        
      return acc
    }, [])
  }

  private static _propertyCache?: Record<string, Prop>
  private static _attrToPropMap?: Map<string, string>
  private static _watcherCache?: Record<string, WatcherHandler>
  private static _computedDecls?: Computed
  private static _accessorPropsCache?: Set<string>

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
    const accessorProps = new Set<string>()

    // Pop classes from the stack and merge their props (child class props override parent class props)
    while (inheritanceStack.length > 0) {
      const cls = inheritanceStack.pop() as typeof BaseElement
      if (Object.prototype.hasOwnProperty.call(cls, 'props') && cls.props) {
        Object.assign(collected, cls.props)
      }

      // Collect props defined via @prop decorator (stored in Symbol.metadata)
      // [TC39 Stage 3 Decorators] context.metadata on each class is accessible via cls[Symbol.metadata]
      const meta = (cls as unknown as { [Symbol.metadata]?: Record<PropertyKey, unknown> })[Symbol.metadata]
      if (meta && Object.hasOwn(meta, PROP_METADATA_KEY)) {
        Object.assign(collected, meta[PROP_METADATA_KEY])
      }

      // Collect accessor prop names (declared via `accessor` keyword)
      if (meta && Object.hasOwn(meta, ACCESSOR_PROPS_KEY)) {
        for (const name of meta[ACCESSOR_PROPS_KEY] as Set<string>) {
          accessorProps.add(name)
        }
      }
    }

    const attrMap = new Map<string, string>()
    for (const [propName, decl] of Object.entries(collected)) {
      if (decl.observe === false) continue

      const attrName = decl.attr ?? toKebab(propName)
      attrMap.set(attrName, propName)
    }

    this._propertyCache = collected
    this._attrToPropMap = attrMap
    this._accessorPropsCache = accessorProps

    return collected
  }

  /**
   * Collect watchers from the entire inheritance chain.
   * Child class watchers override parent class watchers with the same key.
   * Also merges watchers registered via the @watcher decorator (stored in Symbol.metadata).
   */
  private static _collectWatchers(): Record<string, WatcherHandler> {
    if (Object.prototype.hasOwnProperty.call(this, '_watcherCache')) {
      return this._watcherCache!
    }

    const inheritanceStack: (typeof HTMLElement)[] = []
    let current: typeof HTMLElement | null = this as typeof HTMLElement

    while (current && current !== HTMLElement) {
      inheritanceStack.push(current)
      current = Object.getPrototypeOf(current) as typeof HTMLElement | null
    }

    const collected: Record<string, WatcherHandler> = {}

    while (inheritanceStack.length > 0) {
      const cls = inheritanceStack.pop() as typeof BaseElement
      if (Object.prototype.hasOwnProperty.call(cls, 'watchers') && cls.watchers) {
        Object.assign(collected, cls.watchers)
      }

      // [TC39 Stage 3 Decorators] context.metadata on each class is accessible via cls[Symbol.metadata]
      const meta = (cls as unknown as { [Symbol.metadata]?: Record<PropertyKey, unknown> })[Symbol.metadata]
      if (meta && Object.hasOwn(meta, WATCHER_METADATA_KEY)) {
        Object.assign(collected, meta[WATCHER_METADATA_KEY])
      }
    }

    this._watcherCache = collected

    return collected
  }

  /**
   * Collect computed declarations from the entire inheritance chain.
   * Merges static `computed` objects and `@computed` decorator metadata (parent → child override).
   * Result is cached on the class.
   */
  private static _collectComputed(): Computed {
    if (Object.prototype.hasOwnProperty.call(this, '_computedDecls')) {
      return this._computedDecls!
    }

    const inheritanceStack: (typeof HTMLElement)[] = []
    let current: typeof HTMLElement | null = this as typeof HTMLElement

    while (current && current !== HTMLElement) {
      inheritanceStack.push(current)
      current = Object.getPrototypeOf(current) as typeof HTMLElement | null
    }

    const collected: Computed = {}

    while (inheritanceStack.length > 0) {
      const cls = inheritanceStack.pop() as typeof BaseElement
      if (Object.prototype.hasOwnProperty.call(cls, 'computed') && cls.computed) {
        Object.assign(collected, cls.computed)
      }

      // [TC39 Stage 3 Decorators] context.metadata on each class is accessible via cls[Symbol.metadata]
      const meta = (cls as unknown as { [Symbol.metadata]?: Record<PropertyKey, unknown> })[Symbol.metadata]
      if (meta && Object.hasOwn(meta, COMPUTED_METADATA_KEY)) {
        Object.assign(collected, meta[COMPUTED_METADATA_KEY])
      }
    }

    this._computedDecls = collected

    return collected
  }

  static useShadowDOM: boolean = true
  static shadowOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true }

  private _reflecting = false

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
      this._defineReactiveProp(propName, propDecl)

      if (hasPreUpgrade && preUpgradeValue !== undefined) {
        self[propName] = preUpgradeValue
      }
    }
  }

  /**
   * Defines a reactive getter/setter for a single prop on this instance.
   * Extracted so it can be called both from `_initializeProps()` and `_reclaimProp()`.
   */
  private _defineReactiveProp(propName: string, propDecl: Prop) {
    const kebabName = toKebab(propName)
    const internalKey = `_${propName}`
    const self = this as Record<string, unknown>

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
          if (value === null || value === undefined || (propDecl.type === Boolean && value === false)) {
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
  }

  /**
   * Re-establishes the reactive getter/setter for a prop that was overridden by a field initializer
   * (e.g. the `__publicField` call emitted by esbuild when lowering TC39 field decorators).
   *
   * [TC39 Class Fields] Field initializers run *after* `super()` returns per spec, so they can
   * overwrite instance properties defined in the base constructor. This method repairs that.
   *
   * Called automatically via `addInitializer` by the `@prop` decorator when used on a class field
   * (not an `accessor`). Field initializers run after `super()` returns, so they can overwrite the
   * getter/setter that `_initializeProps()` defined. This method runs after the field initializer
   * and restores the reactive accessor.
   *
   * @internal
   */
  _reclaimProp(propName: string): void {
    const constructor = this.constructor as typeof BaseElement
    const allProps = constructor._collectProps()
    const propDecl = allProps[propName]
    if (!propDecl) return

    const self = this as Record<string, unknown>
    const internalKey = `_${propName}`

    // Capture the value that __publicField stored (usually undefined), then remove the
    // plain data property it created so we can redefine the reactive accessor.
    const overriddenValue = self[propName]
    Reflect.deleteProperty(this, propName)

    // Restore the internal backing store in case __publicField somehow cleared it.
    if (!Object.prototype.hasOwnProperty.call(this, internalKey)) {
      self[internalKey] = undefined
    }

    this._defineReactiveProp(propName, propDecl)

    // Re-apply the value through the new setter so initial value (if any) is picked up.
    if (overriddenValue !== undefined) {
      self[propName] = overriddenValue
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
    const allComputed = constructor._collectComputed()
    if (Object.keys(allComputed).length === 0) return

    for (const [computedName, config] of Object.entries(allComputed)) {
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
   * Reflect inline accessor defaults to attributes on the first render.
   * Called once from executeUpdate() before _hasMounted is set to true.
   *
   * [TC39 Stage 3 Auto-Accessors] The `accessor` keyword causes the engine to call the decorator's
   * `init()` synchronously inside the constructor body. At that point, `setAttribute()` is forbidden
   * by the Custom Elements spec (the element is not yet connected). Deferring the reflection to the
   * first microtask update (here) satisfies both specs simultaneously.
   *
   * Accessor props store their inline default in `_propName` (written by the `@prop` init callback)
   * rather than reflecting it immediately, because setAttribute() is forbidden inside the
   * constructor body. This method runs in the first microtask update, past the constructor boundary,
   * so setAttribute() is safe. Setter calls here run while _updatePending is still true, so they
   * merge into the existing _changedProps without scheduling a second microtask → single render.
   */
  private _reflectAccessorDefaults(): void {
    const constructor = this.constructor as typeof BaseElement
    const accessorProps = constructor._accessorPropsCache
    if (!accessorProps || accessorProps.size === 0) return

    const allProps = constructor._propertyCache!
    for (const propName of accessorProps) {
      const propDecl = allProps[propName]
      if (!propDecl || propDecl.reflect === false) continue
      const attrName = propDecl.attr ?? toKebab(propName)
      // HTML attribute (set by parser or attributeChangedCallback) takes priority.
      if (!this.hasAttribute(attrName)) {
        const internalKey = `_${propName}`
        const self = this as Record<string, unknown>
        const value = self[internalKey]
        if (value !== undefined) {
          // Reset backing field so the setter records oldValue = undefined (correct semantics).
          self[internalKey] = undefined
          self[propName] = value
        }
      }
    }
  }

  /**
   * Execute the update cycle: onPrepare → render → onUpdated → onMounted.
   * Called automatically after update is triggered.
   * Can be overridden to customize update behavior, but should call super.executeUpdate() if so.
   */
  protected async executeUpdate(): Promise<void> {
    if (!this._hasMounted) {
      this._reflectAccessorDefaults()
    }

    const changedProps = this._changedProps
    this._changedProps = new Map<string, unknown>()
    this._updatePending = false

    const shouldUpdate = this.onPrepare(changedProps)
    if (shouldUpdate === false) return

    this.triggerWatchers(changedProps)
    this.invalidateComputed(changedProps)

    setRenderContext(this as unknown as Updatable)
    try {
      const result = this.render()
      render(result ?? html(() => {}), this.container)
    } finally {
      clearRenderContext()
    }

    this.onUpdated(changedProps)

    if (!this._hasMounted) {
      this.onMounted(changedProps)
      this._hasMounted = true
    }
  }

  /**
   * Trigger property watchers based on changed props. Called during the update cycle.
   * For each changed property that has a watcher, calls the corresponding handler with (newValue, oldValue).
   * The handler can be a method name string or an inline function.
   * @param changedProps Map of changed property names to their old values
   */
  private triggerWatchers(changedProps: Map<string, unknown>): void {
    const constructor = this.constructor as typeof BaseElement
    const allWatchers = constructor._collectWatchers()
    if (Object.keys(allWatchers).length === 0) return

    for (const [propName, oldValue] of changedProps) {
      const handler = allWatchers[propName]
      if (!handler) continue

      const newValue = (this as Record<string, unknown>)[propName]

      if (typeof handler === 'function') {
        handler.call(this, newValue, oldValue)
      } else {
        const self = this as Record<string, unknown>
        if (typeof self[handler] === 'function') {
          ;(self[handler] as (n: unknown, o: unknown) => void)(newValue, oldValue)
        }
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
    const allComputed = constructor._collectComputed()
    if (Object.keys(allComputed).length === 0) return
    const changedNames = Array.from(changedProps.keys())
    for (const [computedName, config] of Object.entries(allComputed)) {
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
  protected render(): RenderResult | void {}

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
   * Emit a custom event from this component. Wraps the standard CustomEvent API with additional options.
   * @param eventName The name of the event to emit
   * @param options Optional configuration for the event (detail payload, bubbles, composed)
   */
  protected emit(eventName: string, options?: EmitOptions): void {
    emitEvent(this, eventName, options)
  }

  private _listeners?: ListenerRegistry

  /**
   * Add an event listener to this component or a target element. Automatically tracks listeners for cleanup.
   * Can be called with (event, handler) to listen on this component, or (target, event, handler) to listen on a specific target.
   * @example
   * this.listen('click', () => { ... }) // listens for click events on this component
   * this.listen(this.querySelector('button'), 'click', () => { ... }) // listens for click events on a button inside the component
   */
  listen(event: string, handler: EventListenerOrEventListenerObject): void
  listen(target: EventTarget, event: string, handler: EventListenerOrEventListenerObject): void
  listen(eventOrTarget: string | EventTarget, handlerOrEvent: EventListenerOrEventListenerObject | string, maybeHandler?: EventListenerOrEventListenerObject): void {
    if (typeof __DEV__ !== 'undefined' && __DEV__ && getCurrentContext() !== null) {
      throw new Error('[aeico] listen() must not be called inside render(). Use declarative @event syntax instead.')
    }

    if (!this._listeners) this._listeners = new ListenerRegistry()

    if (typeof eventOrTarget === 'string') {
      this._listeners.add(this, eventOrTarget, handlerOrEvent as EventListenerOrEventListenerObject)
    } else {
      this._listeners.add(eventOrTarget, handlerOrEvent as string, maybeHandler!)
    }
  }

  /**
   * Standard custom element lifecycle callbacks.
   *
   * Subclasses that override these MUST call the super implementation:
   * - `disconnectedCallback()`: cleans up registered event listeners.
   * - `attributeChangedCallback()`: drives the reactive prop system.
   */
  connectedCallback() {}

  disconnectedCallback() {
    this._listeners?.removeAll()
  }

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
    const tagName = name || this.tagName || toKebab(this.name)

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
