import AeicoField from './AeicoField'
import type { InferProps, Props } from '../core/types'
import { inputFieldSpec } from '../assets/css/specs'

class InputField extends AeicoField {
  protected fieldElement: HTMLInputElement | null = null

  static tagName = 'input'

  static props: Props = {
    placeholder: { type: String },
    type: { type: String },
  }

  declare placeholder?: string
  declare type?: string

  protected static stylesheets = [inputFieldSpec]

  render() {
    this.build(() => {
      const { div, input } = this.builder

      div({ className: 'input-container' }, () => {
        this.fieldElement = input({
          type: this.type || 'text',
          placeholder: this.placeholder || '',
          onInput: this.boundOnChange,
        })

        this.renderActionButtonsTags()
      })
    })

    if (this.fieldElement && this.value != null) {
      this.fieldElement.value = String(this.value)
    }
    this.updateClearButtonVisibility()
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
export type InputFieldProps = InferProps<typeof InputField>
