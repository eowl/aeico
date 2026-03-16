import AeicoElement from './AeicoElement'
import type { FieldI18nKeys, InferProperties, Props, Watchers } from './types'
import { WithTheme } from './mixins/WithTheme'
import { WithI18n } from './mixins/WithI18n'

export type FieldAction = 'clear' | 'reset' | 'change'
export type FieldElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement

/**
 * Base class with theme and i18n support
 * Composed using WithTheme and WithI18n mixins
 */
const AeicoFieldBase = WithI18n(WithTheme(AeicoElement))

/**
 * Base class for form field components
 * 
 * Provides common functionality for field components including:
 * - Theme support (via WithTheme mixin)
 * - i18n integration (via WithI18n mixin)
 * - Reset button management
 * - Value management
 * - Common configuration handling
 */
class AeicoField extends AeicoFieldBase {
  /**
   * Define base field properties (extends AeicoElement properties)
   */
  static properties: Props = {
    value: { type: String },
    defaultValue: { type: String },
    resettable: { type: Boolean },
    resetText: { type: String },
    clearable: { type: Boolean },
    clearText: { type: String },
    size: { type: String },
  }

  /**
   * Property watchers
   */
  static watchers: Watchers = {
    resettable: 'onResettableChanged',
    clearable: 'onClearableChanged',
    disabled: 'onDisabledChanged',
  }

  /**
   * The underlying form control element (input, select, etc.)
   * Subclasses should set this to their specific element
   */
  protected fieldElement: FieldElement | null = null

  protected resetBtn: HTMLButtonElement | null = null
  protected clearBtn: HTMLButtonElement | null = null

  protected boundOnChange: () => void
  protected boundOnReset: () => void
  protected boundOnClear: () => void

  /**
   * Event prefix for field components
   * All field events will be prefixed with 'field-'
   * 
   * @example
   * this.emit('change')  // Dispatches: 'field-change'
   * this.emit('reset')   // Dispatches: 'field-reset'
   * this.emit('clear')   // Dispatches: 'field-clear'
   */
  static readonly eventPrefix: string = 'field'

  // Declare reactive properties for TypeScript
  declare value?: string
  declare defaultValue?: string
  declare resettable?: boolean
  declare resetText?: string
  declare clearable?: boolean
  declare clearText?: string
  declare size?: string
  declare disabled?: boolean

  constructor() {
    super()

    this.boundOnReset = this.onReset.bind(this)
    this.boundOnClear = this.onClear.bind(this)
    this.boundOnChange = this.onChange.bind(this)
  }

  /**
   * i18n keys configuration for this field
   */
  protected i18nKeys: FieldI18nKeys = {}

  /**
   * Lifecycle: Component connected to DOM
   */
  connectedCallback() {
    super.connectedCallback()
    this.render()
  }

  /**
   * Lifecycle: Component disconnected from DOM
   */
  disconnectedCallback() {
    super.disconnectedCallback()
  }

  /**
   * Handle language change event
   * Updates reset button label and allows subclasses to add custom behavior
   */
  public onLanguageChange() {
    super.onLanguageChange()
    this.updateResetButtonLabel()
    this.updateClearButtonLabel()
  }

  /**
   * Update reset button label with current language
   */
  protected updateResetButtonLabel() {
    if (this.resetBtn) {
      const resetKey = this.i18nKeys.resetButton || 'buttons.reset'
      this.resetBtn.title = this.t(resetKey, '↺')
    }
  }

  /**
   * Update clear button label with current language
   */
  protected updateClearButtonLabel() {
    if (this.clearBtn) {
      const clearKey = this.i18nKeys.clearButton || 'buttons.clear'
      this.clearBtn.title = this.t(clearKey, '×')
    }
  }

  /**
   * Create reset button element with common styling and behavior
   * 
   * @param onReset Callback function to execute when reset button is clicked
   * @returns Configured reset button element
   */
  protected createResetButton(onReset: () => void): HTMLButtonElement {
    const resetText = this.resetText || '↺'
    const resetKey = this.i18nKeys.resetButton || 'buttons.reset'

    const resetBtn = document.createElement('button')

    resetBtn.className = 'reset-btn'
    resetBtn.textContent = resetText
    resetBtn.title = this.t(resetKey, resetText)
    
    resetBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      onReset()
    })
    
    return resetBtn
  }

  /**
   * Create clear button element with common styling and behavior
   * 
   * @param onClear Callback function to execute when clear button is clicked
   * @returns Configured clear button element
   */
  protected createClearButton(onClear: () => void): HTMLButtonElement {
    const clearText = this.clearText || '×'
    const clearKey = this.i18nKeys.clearButton || 'buttons.clear'

    const clearBtn = document.createElement('button')

    clearBtn.className = 'clear-btn'
    clearBtn.textContent = clearText
    clearBtn.title = this.t(clearKey, clearText)
    
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      onClear()
    })
    
    return clearBtn
  }

  protected renderClearButton(container: HTMLElement) {
    if (this.clearable) {
      this.clearBtn = this.createClearButton(this.boundOnClear)
      container.appendChild(this.clearBtn)
    }
  }

  protected renderResetButton(container: HTMLElement) {
    if (this.resettable) {
      this.resetBtn = this.createResetButton(this.boundOnReset)
      container.appendChild(this.resetBtn)
    }
  }

  protected renderActionButtons(container: HTMLElement) {
    this.renderClearButton(container)
    this.renderResetButton(container)
  }

  /**
   * Watcher for resettable property
   */
  protected onResettableChanged() {
    this.render()
  }

  /**
   * Watcher for clearable property
   */
  protected onClearableChanged() {
    this.render()
  }

  /**
   * Watcher for disabled property
   */
  protected onDisabledChanged(newValue: boolean) {
    if (this.fieldElement) {
      (this.fieldElement as HTMLInputElement | HTMLSelectElement).disabled = Boolean(newValue)
    }
  }

  /**
   * Render the field component
   * Override in subclass to provide custom rendering
   */
  render(): void {
    // Default implementation - subclasses can override
  }

  /**
   * Get current value from the field element
   * Default implementation returns the value property of fieldElement
   * Override in subclasses if needed (e.g., checkbox uses checked instead of value)
   * 
   * @returns Current field value
   */
  protected getValue(): any {
    return this.fieldElement?.value || ''
  }

  /**
   * Write value to the underlying UI element and sync props
   * Subclasses must override this to update their specific UI element
   * 
   * @param _value New value to write to the element
   */
  protected writeValue(_value: any): void {
    // Base implementation - subclasses override
  }

  /**
   * Get event payload for change events
   * Override in subclasses to customize event data (e.g., { checked, oldChecked } for checkbox)
   * 
   * @param value New value
   * @param oldValue Previous value
   * @param action Action type
   * @returns Event payload object
   */
  protected getEventPayload(value: any, oldValue: any, action: FieldAction): Record<string, any> {
    return { value, oldValue, action }
  }

  /**
   * Update field value programmatically (internal method)
   * Subclasses should provide type-safe public wrappers (e.g., change() method)
   * 
   * @param value New value
   * @param options.silent If true, won't emit change event (default: true)
   * @param options.action Action type for the event (default: 'change')
   */
  protected setValue(value: any, options?: { silent?: boolean; action?: FieldAction }): void {
    const oldValue = this.getValue()
    
    // Update property value
    this.value = value
    
    // Write to UI element (DOM only)
    this.writeValue(value)
    
    // Emit event if not silent
    if (options?.silent === false) {
      const payload = this.getEventPayload(value, oldValue, options.action || 'change')
      this.emit('change', payload)
    }
  }

  /**
   * Change field value programmatically
   * 
   * @param value New value
   * @param options.silent If false, will emit change event (default: true)
   */
  public change(value: any, options?: { silent?: boolean }): void {
    this.setValue(value, { ...options, action: 'change' })
  }

  /**
   * Reset field to specified value or default value
   * 
   * @param value Value to reset to, defaults to defaultValue prop
   * @param options.silent If false, will emit reset event (default: true)
   */
  public reset(value?: any, options?: { silent?: boolean }): void {
    const resetValue = value !== undefined ? value : this.defaultValue
    this.setValue(resetValue, { ...options, action: 'reset' })
  }

  /**
   * Clear the field value
   * 
   * @param options.silent If false, will emit clear event (default: true)
   */
  public clear(options?: { silent?: boolean }): void {
    this.setValue('', { ...options, action: 'clear' })
  }

  /**
   * Handle change event from user interaction
   * Default implementation reads value from UI and emits change event
   */
  protected onChange(): void {
    this.change(this.getValue(), { silent: false })
  }

  /**
   * Handle clear button click
   * Clears the field and dispatches event
   */
  protected onClear(): void {
    this.clear({ silent: false })
  }

  /**
   * Handle reset button click
   * Resets to default value and dispatches event
   */
  protected onReset(): void {
    this.reset(undefined, { silent: false })
  }
}

export default AeicoField
export type AeicoFieldProps = InferProperties<typeof AeicoField>
