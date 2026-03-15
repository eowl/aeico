import AeicoField from '../AeicoField'
import { isSelectOption } from '../types'
import type { InferProperties, Props, Watchers } from '../types'
import { radioFieldSpec } from '../assets/css/specs'

export type RadioFieldType = 'radio' | 'button' | 'button-group' | 'segmented'
export type RadioOption = string | { label?: string; value: any }
export type RadioOptions = RadioOption[]

class RadioField extends AeicoField {
  protected fieldElement: HTMLInputElement | null = null
  private _radioInputs: HTMLInputElement[] = []
  private _optionButtons: HTMLButtonElement[] = []
  private readonly _groupName: string

  private static _instanceCount = 0

  protected static stylesheets = [radioFieldSpec]

  static properties: Props = {
    options: { type: Array },
    type: { type: String },
  }

  static watchers: Watchers = {
    value: 'onValueChanged',
    options: 'onOptionsChanged',
    type: 'onTypeChanged',
  }

  declare options?: RadioOptions
  declare type?: RadioFieldType

  constructor() {
    super()
    this._groupName = `radio-field-${++RadioField._instanceCount}`
  }

  protected onLanguageChange() {
    super.onLanguageChange()
    this.render()
  }

  protected onValueChanged(value: string): void {
    this.writeValue(value || '')
  }

  protected onOptionsChanged(): void {
    this.render()
  }

  protected onTypeChanged(): void {
    this.render()
  }

  render() {
    this.shadowRoot!.innerHTML = ''
    this._radioInputs = []
    this._optionButtons = []

    const container = document.createElement('div')
    container.className = 'radio-container'

    const type = (this.type as RadioFieldType) || 'radio'
    container.classList.add(`type-${type}`)

    const options = this.options || []
    const currentValue = this.value

    if (type === 'radio') {
      this._renderRadioInputs(container, options, currentValue)
    } else {
      this._renderOptionButtons(container, options, currentValue, type)
    }

    this.renderActionButtons(container)

    this.shadowRoot!.appendChild(container)
  }

  private _getLabel(option: any): string {
    if (!isSelectOption(option)) return String(option)

    return option.label ? this.t(option.label, option.label) : String(option.value)
  }

  private _getValue(option: any): string {
    return isSelectOption(option) ? String(option.value) : String(option)
  }

  private _renderRadioInputs(container: HTMLElement, options: any[], currentValue?: string) {
    options.forEach((option, i) => {
      const value = this._getValue(option)
      const label = this._getLabel(option)

      const wrapper = document.createElement('label')
      wrapper.className = 'radio-option'

      const input = document.createElement('input')
      input.type = 'radio'
      input.name = this._groupName
      input.value = value
      input.checked = currentValue !== undefined && value === String(currentValue)

      input.addEventListener('change', this.boundOnChange)
      this._radioInputs.push(input)

      // Set fieldElement to first radio for base class compatibility
      if (i === 0) this.fieldElement = input

      const span = document.createElement('span')
      span.className = 'radio-label'
      span.textContent = label

      wrapper.appendChild(input)
      wrapper.appendChild(span)
      container.appendChild(wrapper)
    })
  }

  private _renderOptionButtons(
    container: HTMLElement,
    options: any[],
    currentValue?: string,
    type: RadioFieldType = 'button'
  ) {
    const groupClass = type === 'button-group' ? 'button-group-connected' : `${type}-group`
    const optionClass = type === 'button-group' ? 'button-group-connected-option' : `${type}-option`

    const group = document.createElement('div')
    group.className = groupClass

    options.forEach((option) => {
      const value = this._getValue(option)
      const label = this._getLabel(option)

      const btn = document.createElement('button')
      btn.className = optionClass
      btn.textContent = label
      btn.dataset.value = value

      const isSelected = currentValue !== undefined && value === String(currentValue)
      if (isSelected) btn.classList.add('selected')

      btn.addEventListener('click', () => {
        const alreadySelected = btn.classList.contains('selected')
        this._optionButtons.forEach(b => b.classList.remove('selected'))
        if (!alreadySelected) {
          btn.classList.add('selected')
          this.change(value, { silent: false })
        } else {
          this.setValue(undefined, { silent: false, action: 'change' })
        }
      })

      this._optionButtons.push(btn)
      group.appendChild(btn)
    })

    container.appendChild(group)
  }

  protected getValue(): string {
    const checked = this._radioInputs.find(i => i.checked)
    if (checked) return checked.value

    const selected = this._optionButtons.find(b => b.classList.contains('selected'))
    if (selected) return selected.dataset.value || ''

    return ''
  }

  protected writeValue(value: string | undefined): void {
    const strValue = value != null ? String(value) : ''

    for (const input of this._radioInputs) {
      input.checked = input.value === strValue
    }
    for (const btn of this._optionButtons) {
      btn.classList.toggle('selected', btn.dataset.value === strValue)
    }
  }

  public change(value: string, options?: { silent?: boolean }): void {
    this.setValue(value, { ...options, action: 'change' })
  }

  public reset(value?: string, options?: { silent?: boolean }): void {
    const resetValue = value !== undefined ? value : this.defaultValue
    this.setValue(resetValue, { ...options, action: 'reset' })
  }

  public clear(options?: { silent?: boolean }): void {
    const first = this.options?.[0]
    const firstValue = first ? this._getValue(first) : ''
    this.setValue(firstValue, { ...options, action: 'clear' })
  }
}

RadioField.register()

export default RadioField

export type RadioFieldProps = InferProperties<typeof RadioField>
