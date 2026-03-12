import { StyleAdapter } from './utils/StyleAdapter'
import type { 
  StyleProps, 
  Props,
  Prop,
  ComputedDeclaration,
  Watchers,
  StyleVariableGenerator,
  InferProperties
} from './types'
import { getComponentConfig } from './configProvider'
import { createEventEmitter, type ComponentEventEmitter } from './events'

class AeicoElement extends HTMLElement {
  private pendingStyleProps?: StyleProps

  // Batch update system
  private updateRequested = false
  private changedProperties = new Map<string, any>()
  private isFirstUpdate = true
  
  // Computed properties cache
  private computedCache = new Map<string, { deps: string; value: any }>()

  // Static global config (shared across all instances)
  private static globalConfig: ReturnType<typeof getComponentConfig>
  
  // Instance-level config overrides
  private instanceConfig?: Partial<{
    enableI18n: boolean
    theme: string
  }>

  /**
   * Event prefix for this component
   * Subclasses can override to customize event names
   * 
   * @example
   * static readonly eventPrefix = 'field'  // events: 'field-change', 'field-reset'
   * static readonly eventPrefix = ''       // events: 'change', 'reset'
   * 
   * @example
   * // Optional: Add namespace for namespaced events
   * static readonly eventNamespace = 'app'  // events: 'app:field-change'
   */
  static readonly eventPrefix: string = ''

  /**
   * Static events getter - provides class-level access to event names
   * Events are generated dynamically based on eventPrefix and optional eventNamespace
   * 
   * @example
   * console.log(AeicoField.events.change)  // 'field-change'
   * console.log(AeicoField.events.customEvent)  // 'field-customEvent'
   */
  private static staticEvents?: any
  static get events() {
    if (!this.staticEvents) {
      const namespace = (this as any).eventNamespace
      this.staticEvents = createEventEmitter(new EventTarget(), this.eventPrefix, namespace).events
    }

    return this.staticEvents
  }

  /**
   * Static method to register the component as a custom element
   * Subclasses should call this in their own register() method
   */
  static register(name?: string) {
    const tagName = name || this.toKebab(this.name)

    if (!customElements.get(tagName)) {
      customElements.define(tagName, this)
    }
  }

  /**
   * Convert camelCase or PascalCase string to kebab-case
   * Strips leading underscores/numbers to ensure valid custom element names
   * @example
   * toKebab('myPropertyName') // => 'my-property-name'
   * toKebab('MyComponent') // => 'my-component'
   * toKebab('_SelectField') // => 'select-field' (strips leading underscore)
   */
  static toKebab(str: string): string {
    // Strip leading underscores and numbers to ensure valid custom element name
    const cleaned = str.replace(/^[_\d]+/, '')
    return cleaned.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
  }

  /**
   * Instance event emitter - lazily initialized
   */
  private eventEmitter?: ComponentEventEmitter

  /**
   * Instance events getter - provides instance-level access to event names
   * Events are generated dynamically, any property access returns the corresponding event name
   * 
   * @example
   * element.addEventListener(element.events.change, handler)
   * element.addEventListener(element.events.customEvent, handler)  // Dynamically generated
   */
  get events() {
    if (!this.eventEmitter) {
      const constructor = this.constructor as typeof AeicoElement
      const namespace = (constructor as any).eventNamespace
      this.eventEmitter = createEventEmitter(
        this,
        constructor.eventPrefix,
        namespace
      )
    }
    return this.eventEmitter.events
  }

  /**
   * Emit a component event
   * Event name is automatically generated based on eventPrefix and eventNamespace
   * 
   * @param eventKey Event key (any string)
   * @param detail Optional event detail data
   * 
   * @example
   * this.emit('change', { value: 'new value' })
   * // With eventPrefix='field': dispatches 'field-change'
   * // With eventPrefix='': dispatches 'change'
   */
  protected emit(eventKey: string, detail?: any): void {
    if (!this.eventEmitter) {
      const constructor = this.constructor as typeof AeicoElement
      const namespace = (constructor as any).eventNamespace
      this.eventEmitter = createEventEmitter(
        this,
        constructor.eventPrefix,
        namespace
      )
    }
    this.eventEmitter.emit(eventKey, detail)
  }

  /**
   * Static properties declaration
   * Subclasses override this to define their properties
   * 
   * @example
   * static get properties() {
   *   return {
   *     value: { type: String, reflect: true },
   *     count: { type: Number, reflect: false }
   *   }
   * }
   */
  static properties: Props = {
    enableStylesheets: { type: Boolean },
    styleSheetText: { type: String },
    styleSheet: { type: Object },
    loadStyleSheets: { type: Array },
    cssVars: { type: Object },
    theme: { type: String },
    enableI18n: { type: Boolean },
    disabled: { type: Boolean },
    i18n: { type: Object },
  }

  /**
   * Computed properties declaration
   * Automatically cached and re-computed when dependencies change
   * 
   * @example
   * static computed = {
   *   fullName: {
   *     deps: ['firstName', 'lastName'],
   *     compute: (self) => `${self.firstName} ${self.lastName}`
   *   }
   * }
   */
  static computed?: ComputedDeclaration

  /**
   * Property watchers declaration
   * Maps property name to method name
   * 
   * @example
   * static watchers = {
   *   value: 'onValueChanged',
   *   options: 'onOptionsChanged'
   * }
   */
  static watchers?: Watchers

  /**
   * Private CSS stylesheets for this component (loaded via `?inline` imports).
   * Applied in order after `useStyles`. Replaces the single `stylesheet` property.
   *
   * @example
   * ```typescript
   * class MyComponent extends AeicoElement {
   *   protected static stylesheets = [myComponentStyles]
   * }
   * ```
   */
  protected static stylesheets?: string[]

  /**
   * Named styles to load from the shared style registry before applying this
   * component's own stylesheets. Names must either be registered via `preloadStyles`
   * in `setComponentConfig`, or be a preset `PresetStyleName` (auto-resolved via
   * the preset fallback).
   *
   * @example
   * ```typescript
   * class RangeField extends AeicoField {
   *   protected static useStyles = ['form-controls']
   * }
   * ```
   */
  protected static useStyles?: string[]

  /**
   * Instance property declarations
   */
  declare enableStylesheets?: boolean
  declare styleSheetText?: string
  declare styleSheet?: CSSStyleSheet
  declare loadStyleSheets?: string[]
  declare cssVars?: Record<string, any>
  declare theme?: string
  declare enableI18n?: boolean
  declare disabled?: boolean
  declare i18n?: Record<string, any>

  /**
   * Style variable generator for this component
   * Subclasses can override to provide custom style generation based on props
   * 
   * @example
   * ```typescript
   * class MyComponent extends AeicoElement {
   *   protected static styleGenerator: StyleVariableGenerator = {
   *     generate(config) {
   *       return { '--my-color': config.theme === 'dark' ? '#fff' : '#000' }
   *     }
   *   }
   * }
   * ```
   */
  protected static styleGenerator?: StyleVariableGenerator

  /**
   * Automatically generate observedAttributes from properties
   * Walks up the prototype chain to collect all properties from parent classes
   */
  static get observedAttributes(): string[] {
    const allProps = this.collectProperties() as Props
    return Object.entries(allProps)
      .filter(([_, decl]) => decl.attribute !== false)
      .map(([key]) => this.toKebab(key))
  }

  /**
   * Collect all properties from prototype chain
   */
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

  /**
   * Get effective configuration (global + instance overrides)
   */
  protected get effectiveConfig() {
    return {
      ...AeicoElement.globalConfig,
      ...this.instanceConfig
    }
  }
  
  /**
   * Check if i18n is enabled for this component
   */
  protected get i18nEnabled(): boolean {
    return this.effectiveConfig.enableI18n ?? false
  }

  /**
   * Unsubscribe function for i18n language change listener
   */
  private i18nUnsubscribe: (() => void) | null = null

  protected styleAdapter!: StyleAdapter

  constructor() {
    super()
    this.attachShadow({ mode: 'open', delegatesFocus: true })
    this.styleAdapter = new StyleAdapter(this.shadowRoot!, this.style)
    
    // Initialize static global config (only once)
    if (!AeicoElement.globalConfig) {
      AeicoElement.globalConfig = getComponentConfig()
    }

    // Initialize reactive properties and computed properties
    this.initializeProperties()
    this.initializeComputed()
  }

  /**
   * Initialize reactive properties directly on instance
   */
  private initializeProperties() {
    const constructor = this.constructor as typeof AeicoElement
    const allProps = constructor.collectProperties()
    
    for (const [propName, propDecl] of Object.entries(allProps)) {
      const kebabName = constructor.toKebab(propName)
      const internalKey = `_${String(propName)}`  // Internal storage
      
      // Initialize internal storage
      ;(this as any)[internalKey] = undefined
      
      // Define property directly on instance
      Object.defineProperty(this, propName, {
        get: () => {
          // If attribute === false, read from internal storage
          if (propDecl.attribute === false) {
            return (this as any)[internalKey]
          }
          
          // Read from attribute
          const attrName = typeof propDecl.attribute === 'string' 
            ? propDecl.attribute 
            : kebabName
          
          const attrValue = this.getAttribute(attrName)
          if (attrValue === null) {
            return (this as any)[internalKey]  // Fallback to internal storage
          }
          
          return this.deserializeAttribute(attrValue, propDecl)
        },
        set: (value: any) => {
          const oldValue = (this as any)[propName]
          
          // If attribute === false, only store internally
          if (propDecl.attribute === false) {
            ;(this as any)[internalKey] = value
            this.requestUpdate(propName, oldValue)
            return
          }
          
          // Update internal storage
          ;(this as any)[internalKey] = value
          
          // Whether to reflect to attribute
          const shouldReflect = propDecl.reflect !== false
          const attrName = typeof propDecl.attribute === 'string' 
            ? propDecl.attribute 
            : kebabName
          
          if (shouldReflect) {
            if (value === null || value === undefined) {
              this.removeAttribute(attrName)
            } else {
              const serialized = this.serializeAttribute(value, propDecl)
              this.setAttribute(attrName, serialized)
            }
          }
          
          // Request update
          this.requestUpdate(propName, oldValue)
        },
        enumerable: true,
        configurable: true
      })
    }
  }

  /**
   * Initialize computed properties directly on instance
   */
  private initializeComputed() {
    const constructor = this.constructor as typeof AeicoElement
    if (!constructor.computed) return
    
    for (const [computedName, config] of Object.entries(constructor.computed)) {
      Object.defineProperty(this, computedName, {
        get: () => {
          // Generate dependency key
          const depsKey = config.deps
            .map(dep => String((this as any)[dep]))
            .join('|')
          
          const cached = this.computedCache.get(computedName)
          
          // Cache hit
          if (cached && cached.deps === depsKey) {
            return cached.value
          }
          
          // Recompute
          const value = config.compute(this)
          this.computedCache.set(computedName, { deps: depsKey, value })
          return value
        },
        enumerable: true,
        configurable: true
      })
    }
  }

  /**
   * Request an update (batched via microtask)
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
   * Perform the actual update
   */
  private async performUpdate(): Promise<void> {
    const changedProps = this.changedProperties
    this.changedProperties = new Map()
    this.updateRequested = false
    
    // willUpdate hook (can return false to prevent update)
    const shouldUpdate = this.willUpdate(changedProps)
    if (shouldUpdate === false) return
    
    // Trigger watchers
    this.triggerWatchers(changedProps)
    
    // Invalidate computed properties cache
    this.invalidateComputed(changedProps)
    
    // Call render (if exists)
    if (typeof (this as any).render === 'function') {
      (this as any).render()
    }
    
    // updated hook
    this.updated(changedProps)
    
    // firstUpdated hook
    if (this.isFirstUpdate) {
      this.firstUpdated(changedProps)
      this.isFirstUpdate = false
    }
  }

  /**
   * Trigger watchers for changed properties
   */
  private triggerWatchers(changedProps: Map<string, any>): void {
    const constructor = this.constructor as typeof AeicoElement
    if (!constructor.watchers) return
    
    for (const [propName, oldValue] of changedProps) {
      const methodName = constructor.watchers[propName]
      if (methodName && typeof (this as any)[methodName] === 'function') {
        const newValue = (this as any)[propName] as any
        (this as any)[methodName](newValue, oldValue)
      }
    }
  }

  /**
   * Invalidate computed properties that depend on changed properties
   */
  private invalidateComputed(changedProps: Map<string, any>): void {
    const constructor = this.constructor as typeof AeicoElement
    if (!constructor.computed) return
    
    const changedNames = Array.from(changedProps.keys())
    
    for (const [computedName, config] of Object.entries(constructor.computed)) {
      const hasChangedDep = config.deps.some(dep => changedNames.includes(dep))
      if (hasChangedDep) {
        this.computedCache.delete(computedName)
      }
    }
  }

  /**
   * Serialize attribute value
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
   * Deserialize attribute value
   */
  private deserializeAttribute(value: string, propDecl: Prop): any {
    if (propDecl.converter?.fromAttribute) {
      return propDecl.converter.fromAttribute(value, propDecl.type)
    }
    
    if (!value) return value
    
    switch (propDecl.type) {
      case Boolean:
        return value === 'true'
      case Number:
        return Number(value)
      case Array:
      case Object:
        try {
          return JSON.parse(value)
        } catch {
          return propDecl.type === Array ? [] : {}
        }
      default:
        return value
    }
  }

  /*
    * Lifecycle hooks - can be overridden by subclasses
    */

  /**
   * Called before update (can return false to prevent update)
   */
  protected willUpdate(_changedProperties: Map<string, any>): boolean | void {
    // Override in subclass
  }

  /**
   * Called after update
   */
  protected updated(_changedProperties: Map<string, any>): void {
    // Override in subclass
  }

  /**
   * Called after first update
   */
  protected firstUpdated(_changedProperties: Map<string, any>): void {
    // Override in subclass
  }



  /**
   * Generate CSS custom property values for this component instance.
   * Uses the static styleGenerator if defined, reading reactive properties directly.
   * Subclasses should override this method to pass additional props (e.g. size).
   */
  protected generateStyleVars(): Record<string, string> {
    const constructor = this.constructor as typeof AeicoElement
    if (!constructor.styleGenerator) {
      return {}
    }

    return constructor.styleGenerator.generate({
      theme: this.theme,
    })
  }

  /**
   * Lifecycle: Component connected to DOM
   * Automatically subscribes to i18n language changes if enabled
   */
  connectedCallback() {
    const constructor = this.constructor as typeof AeicoElement

    this.styleAdapter.initialize({
      applyStyleNames: AeicoElement.globalConfig?.applyStyleNames,
      enableStylesheets: this.enableStylesheets,
      globalEnableComponentStylesheets: AeicoElement.globalConfig?.enableComponentStylesheets,
      constructorName: constructor.name,
      useStyles: constructor.useStyles,
      stylesheets: constructor.stylesheets,
      pendingStyleProps: this.pendingStyleProps,
      generateStyleVars: () => this.generateStyleVars(),
    })
    this.pendingStyleProps = undefined

    if (this.i18nEnabled) {
      this.subscribeToI18n()
    }
  }

  /**
   * Lifecycle: Component disconnected from DOM
   * Automatically unsubscribes from i18n language changes
   */
  disconnectedCallback() {
    this.unsubscribeFromI18n()
  }

  /**
   * Attribute changed callback
   * Attribute changes automatically trigger property setters which call requestUpdate
   */
  attributeChangedCallback(_name: string, _oldValue: string | null, _newValue: string | null) {
    // Attribute changes are handled automatically by property setters
    // They trigger requestUpdate() which batches updates
  }

  /**
   * Subscribe to i18n language changes
   */
  protected subscribeToI18n() {
    const i18nService = this.effectiveConfig?.i18nService
    if (i18nService) {
      this.i18nUnsubscribe = i18nService.subscribe(() => {
        this.onLanguageChange()
      })
    }
  }

  /**
   * Unsubscribe from i18n language changes
   */
  protected unsubscribeFromI18n() {
    if (this.i18nUnsubscribe) {
      this.i18nUnsubscribe()
      this.i18nUnsubscribe = null
    }
  }

  /**
   * Handle language change event
   * Override in subclass to update UI with new translations
   * 
   * Remember to call super.onLanguageChange() if you override this method
   */
  protected onLanguageChange() {
    // Base implementation - subclasses can override
  }

  /**
   * Get translated text for a key
   * 
   * @param key Translation key
   * @param fallback Fallback text if i18n service is not available
   * @returns Translated text or fallback
   */
  protected t(key: string, fallback?: string): string {
    const i18nService = this.effectiveConfig?.i18nService
    if (i18nService) {
      return i18nService.t(key)
    }
    
    return fallback || key
  }
  
  /**
   * Create a new instance of the component with configuration
   * 
   * @param config Configuration object (properties will be set directly)
   * @returns New component instance
   */
  static create<T extends AeicoElement>(
    this: new () => T,
    config?: Record<string, any>
  ): T {
    const instance = new this()
    
    if (config) {
      // Set properties directly
      Object.entries(config).forEach(([key, value]) => {
        if (key in instance) {
          (instance as any)[key] = value
        }
      })
      
      // Style props are deferred to initializeStyles() when the element connects to DOM
      instance.pendingStyleProps = config as StyleProps
    }
    
    return instance
  }
}

export default AeicoElement
export type AeicoElementProps = InferProperties<typeof AeicoElement>
