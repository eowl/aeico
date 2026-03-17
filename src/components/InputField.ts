import AeicoField from './AeicoField'
import type { InferProperties, Props, Watchers } from '../core/types'
import { inputFieldSpec } from '../assets/css/specs'

class InputField extends AeicoField {
  protected fieldElement: HTMLInputElement | null = null

  static tagName = 'input'

  static properties: Props = {
    placeholder: { type: String },
    type: { type: String },
  }

  static watchers: Watchers = {
    value: 'onValueChanged',
    placeholder: 'onPlaceholderChanged',
    type: 'onTypeChanged',
  }

  declare placeholder?: string
  declare type?: string

  protected static stylesheets = [inputFieldSpec]

  protected onValueChanged(value: string): void {
    this.writeValue(value || '')
  }

  protected onPlaceholderChanged(placeholder: string): void {
    if (this.fieldElement) {
      this.fieldElement.placeholder = placeholder || ''
    }
  }

  protected onTypeChanged(type: string): void {
    if (this.fieldElement) {
      this.fieldElement.type = type || 'text'
    }
  }

  render() {
    if (this.fieldElement) return

    this.shadowRoot!.innerHTML = ''

    const container = document.createElement('div')
    container.className = 'input-container'

    this.fieldElement = document.createElement('input')
    this.fieldElement.type = (this.type as string) || 'text'
    this.fieldElement.placeholder = (this.placeholder as string) || ''

    const currentValue = this.value
    if (currentValue !== undefined && currentValue !== null) {
      this.fieldElement.value = String(currentValue)
    }

    this.fieldElement.addEventListener('input', this.boundOnChange)

    container.appendChild(this.fieldElement)

    this.renderActionButtons(container)

    this.shadowRoot!.appendChild(container)
  }

  /**
   * Update clear button visibility based on input value
   */
  private updateClearButtonVisibility() {
    if (this.clearBtn && this.fieldElement) {
      const hasValue = this.fieldElement.value.length > 0
      this.clearBtn.style.display = hasValue ? '' : 'none'
    }
  }

  /**
   * Write value to the input element (DOM only)
   */
  protected writeValue(value: string): void {
    const strValue = String(value || '')
    
    if (this.fieldElement) {
      this.fieldElement.value = strValue
    }
    
    this.updateClearButtonVisibility()
  }

  /**
   * Change input value programmatically
   * 
   * @param value New value
   * @param options.silent If false, will emit change event (default: true)
   */
  public change(value: string, options?: { silent?: boolean }): void {
    this.setValue(value, { ...options, action: 'change' })
  }
}

// Component is no longer auto-registered
// Call InputField.register() explicitly if needed

export default InputField
export type InputFieldProps = InferProperties<typeof InputField>
