import AeicoField from '../AeicoField'
import type { InferProperties, PropertiesDeclaration, WatchersDeclaration } from '../types'
import checkboxFieldStyle from '../assets/css/checkbox-field.css?inline'

class CheckboxField extends AeicoField {
  protected fieldElement: HTMLInputElement | null = null

  static properties: PropertiesDeclaration = {
    checked: { type: Boolean },
    defaultChecked: { type: Boolean },
    variant: { type: String }, // 'checkbox' | 'toggle'
  }

  static watchers: WatchersDeclaration = {
    checked: 'onCheckedChanged',
    variant: 'onVariantChanged',
  }

  declare checked?: boolean
  declare defaultChecked?: boolean
  declare variant?: string

  protected static stylesheet = checkboxFieldStyle

  protected onCheckedChanged(checked: boolean): void {
    if (this.fieldElement) {
      this.writeValue(checked)
    }
  }

  protected onVariantChanged(): void {
    this.render()
  }

  render() {
    this.shadowRoot!.innerHTML = ''

    const container = document.createElement('div')
    container.className = 'checkbox-container'

    const variant = (this.variant as string) || 'checkbox'
    container.classList.add(`variant-${variant}`)

    // Create wrapper for checkbox/toggle
    const wrapper = document.createElement('div')
    wrapper.className = 'checkbox-wrapper'

    // Create input element
    this.fieldElement = document.createElement('input')
    const input = this.fieldElement as HTMLInputElement
    input.type = 'checkbox'
    input.className = variant === 'toggle' ? 'toggle-input' : 'checkbox-input'

    const currentValue = this.checked
    if (currentValue !== undefined && currentValue !== null) {
      input.checked = Boolean(currentValue)
    }

    input.addEventListener('change', this.boundOnChange)

    wrapper.appendChild(this.fieldElement)

    // Create toggle slider for toggle variant
    if (variant === 'toggle') {
      const slider = document.createElement('span')
      slider.className = 'toggle-slider'
      wrapper.appendChild(slider)
    }

    container.appendChild(wrapper)

    this.renderActionButtons(container)

    this.shadowRoot!.appendChild(container)
  }

  /**
   * Get current checked state from checkbox element
   * Override base implementation to return checked instead of value
   */
  protected getValue(): boolean {
    return this.fieldElement?.checked || false
  }

  /**
   * Write checked state to the checkbox element (DOM only)
   * Note: CheckboxField overrides setValue to sync props.checked
   */
  protected writeValue(checked: boolean): void {
    if (this.fieldElement) {
      this.fieldElement.checked = Boolean(checked)
    }
  }

  /**
   * Customize event payload for checkbox to use checked/oldChecked instead of value/oldValue
   */
  protected getEventPayload(checked: boolean, oldChecked: boolean, action: any): Record<string, any> {
    return { checked, oldChecked, action }
  }

  /**
   * Override setValue to sync checked instead of value
   */
  protected setValue(checked: boolean, options?: { silent?: boolean; action?: any }): void {
    const oldChecked = this.getValue()
    
    // Update checked prop (not value)
    this.checked = checked
    
    // Write to UI element
    this.writeValue(checked)
    
    // Emit event if not silent
    if (options?.silent === false) {
      const payload = this.getEventPayload(checked, oldChecked, options.action || 'change')
      this.emit('change', payload)
    }
  }

  /**
   * Change checkbox state programmatically
   * 
   * @param checked New checked state
   * @param options.silent If false, will emit change event (default: true)
   */
  public change(checked: boolean, options?: { silent?: boolean }): void {
    this.setValue(checked, { ...options, action: 'change' })
  }

  /**
   * Reset checkbox to default checked state
   * 
   * @param checked Checked state to reset to (defaults to defaultChecked prop)
   * @param options.silent If false, will emit reset event (default: true)
   */
  public reset(checked?: boolean, options?: { silent?: boolean }): void {
    const resetValue = checked !== undefined ? checked : (this.defaultChecked ?? false)
    this.setValue(resetValue, { ...options, action: 'reset' })
  }

  /**
   * Clear checkbox (set to unchecked)
   * For checkbox, clear means setting to false
   * 
   * @param options.silent If false, will emit clear event (default: true)
   */
  public clear(options?: { silent?: boolean }): void {
    this.setValue(false, { ...options, action: 'clear' })
  }

  /**
   * Override to not render clear button for checkbox
   * Checkbox semantically doesn't have a "clear" action
   */
  protected renderActionButtons(container: HTMLElement) {
    // Only render reset button, no clear button for checkbox
    this.renderResetButton(container)
  }
}

CheckboxField.register()

export default CheckboxField
export type CheckboxFieldProps = InferProperties<typeof CheckboxField>
