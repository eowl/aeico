import AeicoField from '../aeico-field'
import type { InferProps } from '../../core/types'
import { html, tags } from '../../view'
import { t } from '../../localize'
import type { SelectOptionValue, SelectOption, SelectOptions, SelectPosition, SelectMultiValue } from './defines'
import style from '../styles/components/select.css?inline'
import variables from '../styles/variables.css?inline'
import sizeCSS from '../styles/size.css?inline'
import SelectOptionElement from './select-option'
import { prop } from '../../decorators'

class Select extends AeicoField<SelectOptionValue | SelectMultiValue> {
  protected fieldElement = null
  private _isOpen = false
  private _triggerEl: HTMLElement | null = null
  private _dropdownEl: HTMLElement | null = null
  private _slotEl: HTMLSlotElement | null = null
  private _slotOptionData: Array<{ value: string; label: string }> = []

  static tagName = 'select'

  @prop({ type: Array })
  accessor options: SelectOptions | undefined

  @prop({ type: String })
  accessor position: SelectPosition | undefined

  @prop({ type: String })
  accessor placeholder: string | undefined

  @prop({ type: Boolean })
  accessor multiple: boolean = false

  // Override base class value prop to support both string and array (multi-select).
  // Uses field decorator (not accessor) because TypeScript TS2611 disallows overriding
  // a parent class data property (declare value?) with an accessor in a subclass.
  @prop({
    type: String,
    parser: (v) => {
      if (v === null || v === undefined) return undefined
      try { return JSON.parse(v) } catch { return v }
    },
    formatter: (v) => {
      if (v === null || v === undefined) return ''
      if (Array.isArray(v)) return JSON.stringify(v)
      return String(v)
    },
  })
  override value: SelectOptionValue | SelectMultiValue | undefined = undefined

  protected static styles = [variables, sizeCSS, style]

  protected writeValue(_value: SelectOptionValue | SelectMultiValue): void {
    // Reactive re-render via this.value prop change handles the display update
  }

  protected getValue(): any {
    if (this.multiple) return this._getMultiValues()

    return this.value || ''
  }

  private _getMultiValues(): SelectMultiValue {
    if (Array.isArray(this.value)) return this.value
    if (this.value != null && this.value !== '') return [this.value as SelectOptionValue]

    return []
  }

  protected onDisabledChanged(_newValue: boolean): void {
    // disabled is a reactive prop — render() already picks it up automatically
  }

  private _findLabel(value: SelectOptionValue): string {
    const strVal = String(value)
    if (Array.isArray(this.options)) {
      for (const opt of this.options) {
        if (this._isSelectOption(opt)) {
          if (String(opt.value) === strVal) return t(opt.label, opt.label)
        } else {
          if (String(opt) === strVal) return strVal
        }
      }
    }

    for (const opt of this._slotOptionData) {
      if (opt.value === strVal) return opt.label
    }

    return strVal
  }

  private _onSlotChange(): void {
    if (!this._slotEl) return
    const data: Array<{ value: string; label: string }> = []
    for (const el of this._slotEl.assignedElements({ flatten: true })) {
      if (el.tagName.toLowerCase() !== 'ae-select-option') continue
      const optEl = el as SelectOptionElement
      data.push({
        value: optEl.value ?? el.getAttribute('value') ?? '',
        label: optEl.label || el.textContent?.trim() || '',
      })
    }
    this._slotOptionData = data
    this.update()
  }

  private _toggleDropdown(): void {
    this._isOpen ? this._closeDropdown() : this._openDropdown()
  }

  private _openDropdown(): void {
    this._isOpen = true
    this._syncOpenState()
  }

  private _closeDropdown(): void {
    this._isOpen = false
    this._syncOpenState()
  }

  private _syncOpenState(): void {
    this._triggerEl?.classList.toggle('open', this._isOpen)
    this._dropdownEl?.classList.toggle('open', this._isOpen)
  }

  private readonly _handleOutsideClick = (e: Event): void => {
    if (!e.composedPath().includes(this)) {
      this._closeDropdown()
    }
  }

  private readonly _handleOptionSelect = (e: Event): void => {
    const { value, label } = (e as CustomEvent<{ value: string; label: string }>).detail
    // Temporarily store label so _findLabel fallback isn't needed for just-selected slot options
    if (!this._slotOptionData.find(o => o.value === value)) {
      this._slotOptionData = [...this._slotOptionData.filter(o => o.value !== value), { value, label }]
    }
    if (this.multiple) {
      const current = this._getMultiValues()
      const idx = current.findIndex(v => String(v) === value)
      const next: SelectMultiValue = idx >= 0
        ? current.filter((_, i) => i !== idx)
        : [...current, value]
      // setValue sets this.value (reactive) → schedules update → render() → _syncSlotOptionsSelected()
      this.setValue(next, { silent: false, action: 'change' })
    } else {
      this.setValue(value, { silent: false, action: 'change' })
      this._closeDropdown()
    }
  }

  connectedCallback() {
    super.connectedCallback()
    document.addEventListener('click', this._handleOutsideClick)
    this.addEventListener('selectoption', this._handleOptionSelect)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    document.removeEventListener('click', this._handleOutsideClick)
    this.removeEventListener('selectoption', this._handleOptionSelect)
  }

  private _syncSlotOptionsSelected(): void {
    if (!this._slotEl) return
    const multiValues = this._getMultiValues()
    for (const el of this._slotEl.assignedElements({ flatten: true })) {
      if (el.tagName.toLowerCase() !== 'ae-select-option') continue
      const optEl = el as SelectOptionElement
      const optVal = optEl.value ?? el.getAttribute('value') ?? ''
      const isSelected = this.multiple
        ? multiValues.some(v => String(v) === optVal)
        : this.value != null && this.value !== '' && String(this.value) === optVal
      // undefined triggers removeAttribute via reactive setter
      // (null would work too but undefined is type-safe for boolean | undefined)
      optEl.selected = isSelected ? true : undefined
    }
  }

  render() {
    const position = this.position || 'bottom'
    const multiValues = this.multiple ? this._getMultiValues() : []
    const hasMultiSelection = this.multiple && multiValues.length > 0
    const selectedLabel = !this.multiple && this.value != null && this.value !== '' ? this._findLabel(this.value as SelectOptionValue) : ''
    const isDisabled = Boolean(this.disabled)

    this._syncSlotOptionsSelected()

    return html(({ div, span, slot }) => {
      div({ className: 'select-container' }, () => {
        this._triggerEl = div({
          className: `select-trigger${this._isOpen ? ' open' : ''}${isDisabled ? ' disabled' : ''}`,
          '@click': () => {
            if (isDisabled) return

            this._toggleDropdown()
          },
        }, () => {
          if (this.multiple) {
            if (hasMultiSelection) {
              div({ className: 'select-selected-list' }, () => {
                for (const v of multiValues) {
                  const lbl = this._findLabel(v)
                  span({ key: `sel-${v}`, className: 'select-selected-item' }, () => {
                    span({ className: 'select-selected-label', textContent: lbl })
                    span({
                      className: 'select-selected-remove',
                      textContent: '×',
                      '@click': (e: Event) => {
                        e.stopPropagation()
                        if (isDisabled) return

                        const next = multiValues.filter(item => String(item) !== String(v))
                        this.setValue(next, { silent: false, action: 'change' })
                      },
                    })
                  })
                }
              })
            } else {
              span({ className: 'select-value select-placeholder', textContent: this.placeholder || '' })
            }
          } else {
            if (selectedLabel) {
              span({ className: 'select-value', textContent: selectedLabel })
            } else {
              span({ className: 'select-value select-placeholder', textContent: this.placeholder || '' })
            }
          }
          span({ className: 'select-arrow', textContent: '▾' })
        }) as HTMLElement

        this._dropdownEl = div({
          className: `select-dropdown position-${position}${this._isOpen ? ' open' : ''}`,
        }, () => {
          this._renderProgrammaticOptions()
          this._slotEl = slot({
            '@slotchange': () => this._onSlotChange(),
          }) as HTMLSlotElement
        }) as HTMLElement

        this.renderActionButtons()
      })
    })
  }

  private _renderProgrammaticOptions(): void {
    if (!Array.isArray(this.options)) return

    const { aeSelectOption } = tags
    const multiValues = this.multiple ? this._getMultiValues() : []
    for (const opt of this.options) {
      if (this._isSelectOption(opt)) {
        const isSelected = this.multiple
          ? multiValues.some(v => String(v) === String(opt.value))
          : this.value != null && String(opt.value) === String(this.value)
        aeSelectOption({
          key: `opt-${opt.value}`,
          value: String(opt.value),
          label: opt.label,
          textContent: t(opt.label, opt.label),
          selected: isSelected ? true : undefined,
        })
      } else {
        const isSelected = this.multiple
          ? multiValues.some(v => String(v) === String(opt))
          : this.value != null && String(opt) === String(this.value)
        aeSelectOption({
          key: `opt-${opt}`,
          value: String(opt),
          textContent: String(opt),
          selected: isSelected ? true : undefined,
        })
      }
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
}

Select.register()

declare global {
  interface HTMLElementTagNameMap {
    'ae-select': Select
  }
}

export default Select
export type SelectProps = InferProps<typeof Select>
