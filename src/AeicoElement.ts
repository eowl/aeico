import styleSheetLoader from './utils/styleSheetLoader'
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
  private _sheets: CSSStyleSheet[] = []
  private _loadedSheets: Set<CSSStyleSheet> = new Set()
  private static _preloaded = false
  private _stylesInitialized = false
  private _pendingStyleProps?: StyleProps
  protected enableBaseStyles = true

  // Batch update system
  private _updateRequested = false
  private _changedProperties = new Map<string, any>()
  private _isFirstUpdate = true
  
  // Computed properties cache
  private _computedCache = new Map<string, { deps: string; value: any }>()

  // Static global config (shared across all instances)
  private static _globalConfig: ReturnType<typeof getComponentConfig>
  
  // Instance-level config overrides
  private _instanceConfig?: Partial<{
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
  private static _staticEvents?: any
  static get events() {
    if (!this._staticEvents) {
      const namespace = (this as any).eventNamespace
      this._staticEvents = createEventEmitter(new EventTarget(), this.eventPrefix, namespace).events
    }

    return this._staticEvents
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
  private _eventEmitter?: ComponentEventEmitter

  /**
   * Instance events getter - provides instance-level access to event names
   * Events are generated dynamically, any property access returns the corresponding event name
   * 
   * @example
   * element.addEventListener(element.events.change, handler)
   * element.addEventListener(element.events.customEvent, handler)  // Dynamically generated
   */
  get events() {
    if (!this._eventEmitter) {
      const constructor = this.constructor as typeof AeicoElement
      const namespace = (constructor as any).eventNamespace
      this._eventEmitter = createEventEmitter(
        this,
        constructor.eventPrefix,
        namespace
      )
    }
    return this._eventEmitter.events
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
    if (!this._eventEmitter) {
      const constructor = this.constructor as typeof AeicoElement
      const namespace = (constructor as any).eventNamespace
      this._eventEmitter = createEventEmitter(
        this,
        constructor.eventPrefix,
        namespace
      )
    }
    this._eventEmitter.emit(eventKey, detail)
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
    useDefaultStyleSheet: { type: Boolean },
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
   * Static stylesheet for this component
   * Subclasses can override to provide component-specific styles
   * 
   * @example
   * ```typescript
   * class MyComponent extends AeicoElement {
   *   protected static stylesheet = myComponentStyles
   * }
   * ```
   */
  protected static stylesheet?: string

  /**
   * Instance property declarations
   */
  declare useDefaultStyleSheet?: boolean
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
      ...AeicoElement._globalConfig,
      ...this._instanceConfig
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
  private _i18nUnsubscribe: (() => void) | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open', delegatesFocus: true })
    
    // Initialize static global config (only once)
    if (!AeicoElement._globalConfig) {
      AeicoElement._globalConfig = getComponentConfig()
    }

    // Initialize reactive properties and computed properties
    this._initializeProperties()
    this._initializeComputed()
  }

  /**
   * Initialize reactive properties directly on instance
   */
  private _initializeProperties() {
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
          
          return this._deserializeAttribute(attrValue, propDecl)
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
              const serialized = this._serializeAttribute(value, propDecl)
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
  private _initializeComputed() {
    const constructor = this.constructor as typeof AeicoElement
    if (!constructor.computed) return
    
    for (const [computedName, config] of Object.entries(constructor.computed)) {
      Object.defineProperty(this, computedName, {
        get: () => {
          // Generate dependency key
          const depsKey = config.deps
            .map(dep => String((this as any)[dep]))
            .join('|')
          
          const cached = this._computedCache.get(computedName)
          
          // Cache hit
          if (cached && cached.deps === depsKey) {
            return cached.value
          }
          
          // Recompute
          const value = config.compute(this)
          this._computedCache.set(computedName, { deps: depsKey, value })
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
      this._changedProperties.set(name, oldValue)
    }
    
    if (!this._updateRequested) {
      this._updateRequested = true
      queueMicrotask(() => this.performUpdate())
    }
  }

  /**
   * Perform the actual update
   */
  private async performUpdate(): Promise<void> {
    const changedProps = this._changedProperties
    this._changedProperties = new Map()
    this._updateRequested = false
    
    // willUpdate hook (can return false to prevent update)
    const shouldUpdate = this.willUpdate(changedProps)
    if (shouldUpdate === false) return
    
    // Trigger watchers
    this._triggerWatchers(changedProps)
    
    // Invalidate computed properties cache
    this._invalidateComputed(changedProps)
    
    // Call render (if exists)
    if (typeof (this as any).render === 'function') {
      (this as any).render()
    }
    
    // updated hook
    this.updated(changedProps)
    
    // firstUpdated hook
    if (this._isFirstUpdate) {
      this.firstUpdated(changedProps)
      this._isFirstUpdate = false
    }
  }

  /**
   * Trigger watchers for changed properties
   */
  private _triggerWatchers(changedProps: Map<string, any>): void {
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
  private _invalidateComputed(changedProps: Map<string, any>): void {
    const constructor = this.constructor as typeof AeicoElement
    if (!constructor.computed) return
    
    const changedNames = Array.from(changedProps.keys())
    
    for (const [computedName, config] of Object.entries(constructor.computed)) {
      const hasChangedDep = config.deps.some(dep => changedNames.includes(dep))
      if (hasChangedDep) {
        this._computedCache.delete(computedName)
      }
    }
  }

  /**
   * Serialize attribute value
   */
  private _serializeAttribute(value: any, propDecl: Prop): string {
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
  private _deserializeAttribute(value: string, propDecl: Prop): any {
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

  // ========================================
  // Lifecycle Hooks
  // ========================================

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

  protected enableBaseStylesheet() {
    this.enableBaseStyles = true
  }

  protected disableBaseStylesheet() {
    this.enableBaseStyles = false
  }

  addStyle(style: string) {
    const sheet = styleSheetLoader.getSheet(style)
    this._addSheet(sheet)
  }

  addStyleSheet(sheet: CSSStyleSheet) {
    this._addSheet(sheet)
  }

  addStyleSheets(sheets: CSSStyleSheet[]) {
    for (const sheet of sheets) {
      this._addSheet(sheet)
    }
  }

  loadStyles(names: string[]) {
    const sheets = styleSheetLoader.getCommonSheets(names)
    this.addStyleSheets(sheets)
  }

  setCssVars(vars: Record<string, string>) {
    Object.entries(vars).forEach(([key, value]) => {
      this.style.setProperty(key, value)
    })
  }

  private _addSheet(sheet: CSSStyleSheet) {
    if (!this._loadedSheets.has(sheet)) {
      this._loadedSheets.add(sheet)
      this._sheets.push(sheet)
      this.shadowRoot!.adoptedStyleSheets = this._sheets
    }
  }

  private addBaseStyle() {
    const sheet = styleSheetLoader.getCommonSheet('components')
    if (sheet) {
      this._addSheet(sheet)
    }
  }

  /**
   * Initialize styles when component is first connected to DOM
   * This method is called automatically by connectedCallback
   */
  private _initializeStyles() {
    if (this._stylesInitialized) {
      return  // Prevent re-initialization
    }
    
    // Add base styles
    if (this.enableBaseStyles) {
      this.addBaseStyle()
    }
    
    // Apply static stylesheet
    const constructor = this.constructor as typeof AeicoElement
    if (constructor.stylesheet) {
      this.addStyle(constructor.stylesheet)
    }
    
    // Apply pending style props if any
    if (this._pendingStyleProps) {
      this.applyStyleProps(this._pendingStyleProps)
      this._pendingStyleProps = undefined
    }
    
    this._stylesInitialized = true
  }

  /**
   * Generate style variables based on component props
   * Uses the styleGenerator if available, combining with component properties
   * 
   * @param config Configuration object containing theme and other properties
   * @returns CSS variables object
   */
  protected generateStyleVars(config?: Record<string, any>): Record<string, string> {
    const constructor = this.constructor as typeof AeicoElement
    if (!constructor.styleGenerator) {
      return {}
    }
    
    return constructor.styleGenerator.generate({
      theme: config?.theme,
    })
  }

  /**
   * Apply style configuration to the component instance
   * Note: Static stylesheet is handled by _initializeStyles, not here
   * @param styleProps Style configuration object
   */
  private applyStyleProps(styleProps?: StyleProps) {
    if (!styleProps) {
      return
    }

    if (styleProps.loadStyleSheets && Array.isArray(styleProps.loadStyleSheets)) {
      this.loadStyles(styleProps.loadStyleSheets)
    }

    if (styleProps.styleSheetText && typeof styleProps.styleSheetText === 'string') {
      this.addStyle(styleProps.styleSheetText)
    }

    if (styleProps.styleSheet && styleProps.styleSheet instanceof CSSStyleSheet) {
      this.addStyleSheet(styleProps.styleSheet)
    }

    // Generate and apply style variables based on props (e.g., theme)
    const generatedVars = this.generateStyleVars(styleProps)
    if (Object.keys(generatedVars).length > 0) {
      this.setCssVars(generatedVars)
    }

    // Apply manual cssVars last (highest priority, overrides generated vars)
    if (styleProps.cssVars && typeof styleProps.cssVars === 'object') {
      this.setCssVars(styleProps.cssVars)
    }
  }

  /**
   * Lifecycle: Component connected to DOM
   * Automatically subscribes to i18n language changes if enabled
   */
  connectedCallback() {
    // Preload common styles (class-level, only once)
    if (!AeicoElement._preloaded) {
      styleSheetLoader.preloadCommonStyles()
      AeicoElement._preloaded = true
    }
    
    // Initialize styles on first connection
    this._initializeStyles()
    
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
    const config = getComponentConfig()
    if (config.i18nService) {
      this._i18nUnsubscribe = config.i18nService.subscribe(() => {
        this.onLanguageChange()
      })
    }
  }

  /**
   * Unsubscribe from i18n language changes
   */
  protected unsubscribeFromI18n() {
    if (this._i18nUnsubscribe) {
      this._i18nUnsubscribe()
      this._i18nUnsubscribe = null
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
    const config = getComponentConfig()
    if (config.i18nService) {
      return config.i18nService.t(key)
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
      
      // Apply style props
      if (instance.isConnected) {
        instance.applyStyleProps(config as StyleProps)
      } else {
        instance._pendingStyleProps = config as StyleProps
      }
    }
    
    return instance
  }
}

export default AeicoElement
export type AeicoElementProps = InferProperties<typeof AeicoElement>
