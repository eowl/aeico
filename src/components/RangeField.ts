import AeicoField from '../AeicoField'
import { isSelectOption } from '../types'
import type { InferProperties, Props, Watchers } from '../types'
import { rangeFieldSpec } from '../assets/css/specs'

class RangeField extends AeicoField {
  protected fieldElement: HTMLInputElement | null = null
  private valueLabel: HTMLSpanElement | null = null

  protected static stylesheets = [rangeFieldSpec]

  static properties: Props = {
    options: { type: Array },
    percentage: { type: Boolean },
    min: { type: Number },
    max: { type: Number },
    step: { type: Number },
  }

  static watchers: Watchers = {
    value: 'onValueChanged',
    options: 'onOptionsChanged',
    min: 'onMinChanged',
    max: 'onMaxChanged',
    step: 'onStepChanged',
    percentage: 'onPercentageChanged',
  }

  declare options?: any[]
  declare percentage?: boolean
  declare min?: number
  declare max?: number
  declare step?: number

  constructor() {
    super()
  }

  /**
   * Write value to the range element (DOM only)
   */
  protected writeValue(value: string): void {
    const strValue = String(value || '')

    if (this.fieldElement) {
      // Only update DOM when value actually changes to avoid interruption during dragging
      if (this.fieldElement.value !== strValue) {
        this.fieldElement.value = strValue
      }
    }
    
    if (this.valueLabel) {
      this.valueLabel.textContent = this.percentage ? `${strValue}%` : strValue
    }
  }

  protected onValueChanged(value: string): void {
    this.writeValue(value || '')
  }

  protected onOptionsChanged(): void {
    this.updateRangeOptions()
  }

  protected onMinChanged(): void {
    this.updateRangeOptions()
  }

  protected onMaxChanged(): void {
    this.updateRangeOptions()
  }

  protected onStepChanged(): void {
    this.updateRangeOptions()
  }

  protected onPercentageChanged(): void {
    if (this.valueLabel) {
      const currentValue = this.value || ''
      this.valueLabel.textContent = this.percentage ? `${currentValue}%` : String(currentValue)
    }
  }

  render() {
    this.shadowRoot!.innerHTML = ''
    
    const container = document.createElement('div')
    container.className = 'range-container'
    
    this.fieldElement = document.createElement('input')
    this.fieldElement.type = 'range'
    this.updateRangeOptions()
    
    const currentValue = this.value
    if (currentValue) {
      this.fieldElement.value = String(currentValue)
    }
    
    this.valueLabel = document.createElement('span')
    this.valueLabel.className = 'value-label'
    const displayValue = this.percentage ? `${currentValue || this.fieldElement.value}%` : String(currentValue || this.fieldElement.value)
    this.valueLabel.textContent = displayValue
    
    // Update label in real-time during dragging (does not trigger property system to avoid DOM re-render interruption)
    this.fieldElement.addEventListener('input', () => {
      if (this.fieldElement && this.valueLabel) {
        const v = this.fieldElement.value
        this.valueLabel.textContent = this.percentage ? `${v}%` : v
      }
    })
    
    // Only submit value on mouse release/click (change event), avoid triggering performUpdate → render() during dragging
    this.fieldElement.addEventListener('change', this.boundOnChange)
    
    container.appendChild(this.fieldElement)
    container.appendChild(this.valueLabel)
    
    this.renderActionButtons(container)
    
    this.shadowRoot!.appendChild(container)
  }

  updateRangeOptions() {
    if (!this.fieldElement) return
    
    const min = this.min
    const max = this.max
    const step = this.step
    
    if (min !== undefined) {
      this.fieldElement.min = String(min)
    }
    if (max !== undefined) {
      this.fieldElement.max = String(max)
    }
    if (step !== undefined) {
      this.fieldElement.step = String(step)
    }
    
    const options = this.options
    if (Array.isArray(options) && options.length > 0) {
      const values = options.map(opt => 
        isSelectOption(opt) ? Number(opt.value) : Number(opt)
      ).sort((a, b) => a - b)
      
      if (min === undefined) {
        this.fieldElement.min = String(Math.min(...values))
      }
      if (max === undefined) {
        this.fieldElement.max = String(Math.max(...values))
      }
      if (step === undefined) {
        // auto step: calculate the minimum difference between adjacent values
        let minDiff = Infinity
        for (let i = 1; i < values.length; i++) {
          const diff = values[i] - values[i - 1]
          if (diff > 0 && diff < minDiff) {
            minDiff = diff
          }
        }
        // if not found a suitable step, default to 1
        this.fieldElement.step = minDiff === Infinity ? '1' : String(minDiff)
      }
    }
  }

  /**
   * Change range value programmatically
   * 
   * @param value New value
   * @param options.silent If false, will emit change event (default: true)
   */
  public change(value: string, options?: { silent?: boolean }): void {
    this.setValue(value, { ...options, action: 'change' })
  }

  /**
   * Clear the range field (set to minimum value)
   * For range inputs, clear means resetting to the minimum value
   * 
   * @param options.silent If false, will emit clear event (default: true)
   */
  public clear(options?: { silent?: boolean }): void {
    const minValue = this.fieldElement?.min || '0'
    this.setValue(minValue, { ...options, action: 'clear' })
  }
}

RangeField.register()

export default RangeField
export type RangeFieldProps = InferProperties<typeof RangeField>
