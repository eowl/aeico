import AeicoField from './aeico-field'
import { isSelectOption } from '../core/types'
import type { InferProps, Props, Watchers } from '../core/types'
import { getI18nService, hasI18nService } from '../core/i18n'
import { selectFieldSpec } from '../assets/css/specs'

class SelectField extends AeicoField {
  protected fieldElement: HTMLSelectElement | null = null
  private slotEl: HTMLSlotElement | null = null
  private isSlotMode = false

  static tagName = 'select'

  static get properties(): Props {
    return {
      options: { type: Array },
    }
  }

  static get watchers(): Watchers {
    return {
      value: 'onValueChanged',
      options: 'onOptionsChanged',
      resettable: 'onResettableChanged',
      clearable: 'onClearableChanged',
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
    if (this.fieldElement) {
      // Only update if not in slot mode or slot is empty
      this.detectMode()
      if (!this.isSlotMode) {
        this.updateOptions()
      }
    }
  }

  /**
   * Detect whether to use slot mode (Light DOM options) or attribute mode
   */
  private detectMode(): void {
    if (!this.slotEl) {
      this.isSlotMode = false
      
      return
    }
    const slottedElements = this.slotEl.assignedElements({ flatten: true })
    const hasOptions = slottedElements.some(el => el.tagName.toLowerCase() === 'option')
    this.isSlotMode = hasOptions
  }

  /**
   * Setup slot mode: clone Light DOM options to shadow select
   */
  private setupSlotMode(): void {
    if (!this.fieldElement || !this.slotEl) return
    
    // Get all option elements from Light DOM
    const slottedElements = this.slotEl.assignedElements({ flatten: true })
    const slottedOptions = slottedElements.filter(el => el.tagName.toLowerCase() === 'option')
    
    // Clear existing options
    this.fieldElement.innerHTML = ''
    
    // Clone each option element to shadow select
    slottedOptions.forEach(optionEl => {
      const clonedOption = optionEl.cloneNode(true) as HTMLOptionElement
      this.fieldElement!.appendChild(clonedOption)
    })
    
    // Restore value if needed
    const currentValue = this.value
    if (currentValue) {
      this.fieldElement.value = String(currentValue)
    }
  }

  render() {
    if (this.fieldElement) return

    this.shadowRoot!.innerHTML = ''
    
    const container = document.createElement('div')
    container.className = 'select-container'
    
    // Create slot for Light DOM options
    this.slotEl = document.createElement('slot')
    this.slotEl.style.display = 'none' // Hide slot, we'll clone its content
    this.slotEl.addEventListener('slotchange', () => this.onSlotChange())
    
    this.fieldElement = document.createElement('select')
    
    // Detect mode and setup accordingly
    this.detectMode()
    if (this.isSlotMode) {
      this.setupSlotMode()
    } else {
      this.updateOptions()
    }
    
    const currentValue = this.value
    if (currentValue) {
      this.fieldElement.value = String(currentValue)
    }
    
    this.fieldElement.addEventListener('change', this.boundOnChange)
    
    container.appendChild(this.slotEl)
    container.appendChild(this.fieldElement)
    
    this.renderActionButtons(container)
    
    this.shadowRoot!.appendChild(container)
  }

  /**
   * Handle slot content changes
   */
  private onSlotChange(): void {
    this.detectMode()
    if (this.isSlotMode) {
      this.setupSlotMode()
    }
  }

  updateOptions() {
    if (!this.fieldElement) return
    
    // In slot mode, don't generate options from attribute
    if (this.isSlotMode) return
    
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

export type SelectFieldProps = InferProps<typeof SelectField>
