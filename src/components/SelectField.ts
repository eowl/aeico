import AeicoField from '../AeicoField'
import { isSelectOption } from '../types'
import type { InferProperties, Props, Watchers } from '../types'
import { getI18nService, hasI18nService } from '../i18n'
import { selectFieldSpec } from '../assets/css/specs'

class SelectField extends AeicoField {
  protected fieldElement: HTMLSelectElement | null = null

  static get properties(): Props {
    return {
      options: { type: Array },
    }
  }

  static get watchers(): Watchers {
    return {
      value: 'onValueChanged',
      options: 'onOptionsChanged',
    }
  }

  declare options?: any[]

  protected static stylesheets = [selectFieldSpec]

  public onLanguageChange() {
    super.onLanguageChange()
    this.updateOptions()
  }

  /**
   * Write value to the select element (DOM only)
   */
  protected writeValue(value: string): void {
    if (this.fieldElement) {
      this.fieldElement.value = String(value || '')
    }
  }

  protected onValueChanged(value: string): void {
    this.writeValue(value || '')
  }

  protected onOptionsChanged(): void {
    this.updateOptions()
  }

  render() {
    this.shadowRoot!.innerHTML = ''
    
    const container = document.createElement('div')
    container.className = 'select-container'
    
    this.fieldElement = document.createElement('select')
    this.updateOptions()
    
    const currentValue = this.value
    if (currentValue) {
      this.fieldElement.value = String(currentValue)
    }
    
    this.fieldElement.addEventListener('change', this.boundOnChange)
    
    container.appendChild(this.fieldElement)
    
    this.renderActionButtons(container)
    
    this.shadowRoot!.appendChild(container)
  }

  updateOptions() {
    if (!this.fieldElement) return
    
    const currentValue = this.value
    const valueToRestore = this.fieldElement.value || currentValue
    this.fieldElement.innerHTML = ''
    
    const options = this.options
    if (Array.isArray(options)) {
      options.forEach((option) => {
        const optionElement = document.createElement('option')
        if (isSelectOption(option)) {
          optionElement.value = String(option.value)
          const labelText = option.label && hasI18nService() ? getI18nService().t(option.label) : String(option.value)
          optionElement.text = labelText
        } else {
          optionElement.value = String(option)
          optionElement.text = String(option)
        }
        this.fieldElement!.appendChild(optionElement)
      })
    }
    
    if (valueToRestore) {
      this.fieldElement.value = valueToRestore
    }
  }

  /**
   * Change select value programmatically
   * 
   * @param value New value
   * @param options.silent If false, will emit change event (default: true)
   */
  public change(value: string, options?: { silent?: boolean }): void {
    this.setValue(value, { ...options, action: 'change' })
  }
}

// Component is no longer auto-registered
// Call SelectField.register() explicitly if needed

export default SelectField

export type SelectFieldProps = InferProperties<typeof SelectField>
