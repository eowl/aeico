import AeicoField from '../aeico-field'
import type { InferProps, Props } from '../../core/types'
import variables from '../styles/variables.css?inline'
import style from '../styles/components/text-input.css?inline'

class TextInput extends AeicoField {
  protected fieldElement: HTMLInputElement | null = null

  static tagName = 'text-input'

  static props: Props = {
    placeholder: { type: String },
    type: { type: String },
  }

  declare placeholder?: string
  declare type?: string

  protected static styles = [variables, style]

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
}

// Component is no longer auto-registered
// Call TextInput.register() explicitly if needed

export default TextInput
export type TextInputProps = InferProps<typeof TextInput>
