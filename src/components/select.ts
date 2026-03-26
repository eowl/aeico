import AeicoField from './aeico-field'
import type { InferProps, Props } from '../core/types'
import { selectFieldSpec } from '../assets/css/specs'

export type SelectOptionValue = string | number

export type SelectOption = {
  label: string
  value: SelectOptionValue
}

export type SelectOptions = SelectOptionValue[] | SelectOption[]

class Select extends AeicoField {
  protected fieldElement: HTMLSelectElement | null = null
  private _slotEl: HTMLSlotElement | null = null
  private _slotOptions: HTMLOptionElement[] = []

  static tagName = 'select'

  static props: Props = {
    options: { type: Array },
  }

  declare options?: SelectOptions

  protected static stylesheets = [selectFieldSpec]

  protected writeValue(value: SelectOptionValue): void {
    if (this.fieldElement) {
      this.fieldElement.value = String(value || '')
    }
  }

  private _onSlotChange(): void {
    if (!this._slotEl) return
    
    this._slotOptions = (this._slotEl.assignedElements({ flatten: true }) as HTMLElement[])
      .filter(el => el.tagName.toLowerCase() === 'option') as HTMLOptionElement[]
    this.requestUpdate()
  }

  render() {
    const { div, select, slot } = this.builder
    this.build(() => {
      div({ className: 'select-container' }, () => {
        this.fieldElement = select({ onChange: this.boundOnChange }, () => {
          this._renderOptions()
        }) as HTMLSelectElement
        this.renderActionButtonsTags()
      })

      const slotEl = slot({ style: { display: 'none' } }) as HTMLSlotElement
      if (!this._slotEl) {
        this._slotEl = slotEl
        this._slotEl.addEventListener('slotchange', () => this._onSlotChange())
      }
    })

    if (this.value) this.writeValue(this.value)
  }

  private _renderOptions(): void {
    const { option } = this.builder
    if (Array.isArray(this.options)) {
      for (const opt of this.options) {
        if (this._isSelectOption(opt)) {
          option({ key: `opt-${opt.value}`, value: opt.value, textContent: this.t(opt.label, opt.label) })
        } else {
          option({ key: `opt-${opt}`, value: opt, textContent: String(opt) })
        }
      }
    }

    for (const optEl of this._slotOptions) {
      option({ key: `slot-${optEl.value}`, value: optEl.value, textContent: optEl.text })
    }
  }

  private _isSelectOption(option: unknown): option is SelectOption {
    return (
      option !== null &&
      typeof option === 'object' &&
      typeof (option as SelectOption).label === 'string' &&
      (typeof (option as SelectOption).value === 'string' || typeof (option as SelectOption).value === 'number')
    )
  }

  public change(value: SelectOptionValue, options?: { silent?: boolean }): void {
    this.setValue(value, { ...options, action: 'change' })
  }
}

export default Select
export type SelectProps = InferProps<typeof Select>
