import AeicoField from '../aeico-field'
import type { InferProps, Props } from '../../core/types'
import { html, tags } from '../../view'
import { t } from '../../localize'
import type { SelectOptionValue, SelectOption, SelectOptions, SelectPosition } from './defines'
import style from '../styles/components/select.css?inline'
import variables from '../styles/variables.css?inline'
import sizeCSS from '../styles/size.css?inline'
import './select-option'

class Select extends AeicoField {
  protected fieldElement = null
  private _isOpen = false
  private _triggerEl: HTMLElement | null = null
  private _dropdownEl: HTMLElement | null = null
  private _slotEl: HTMLSlotElement | null = null
  private _slotOptionData: Array<{ value: string; label: string }> = []

  static tagName = 'select'

  static props: Props = {
    options: { type: Array },
    position: { type: String },
    placeholder: { type: String },
  }

  declare options?: SelectOptions
  declare position?: SelectPosition
  declare placeholder?: string

  protected static styles = [variables, sizeCSS, style]

  protected writeValue(_value: SelectOptionValue): void {
    // Reactive re-render via this.value prop change handles the display update
  }

  protected getValue(): any {
    return this.value || ''
  }

  protected onDisabledChanged(_newValue: boolean): void {
    this.update()
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
    this._slotOptionData = (this._slotEl.assignedElements({ flatten: true }) as HTMLElement[])
      .filter(el => el.tagName.toLowerCase() === 'ae-select-option')
      .map(el => ({
        value: (el as any).value ?? el.getAttribute('value') ?? '',
        label: (el as any).label || el.textContent?.trim() || '',
      }))
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
    this.setValue(value, { silent: false, action: 'change' })
    this._closeDropdown()
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

  render() {
    const position = this.position || 'bottom'
    const selectedLabel = this.value != null && this.value !== '' ? this._findLabel(this.value) : ''
    const isDisabled = Boolean(this.disabled)

    return html(({ div, span, slot }) => {
      div({ className: 'select-container' }, () => {
        this._triggerEl = div({
          className: `select-trigger${this._isOpen ? ' open' : ''}${isDisabled ? ' disabled' : ''}`,
          '@click': () => {
            if (isDisabled) return
            this._toggleDropdown()
          },
        }, () => {
          if (selectedLabel) {
            span({ className: 'select-value', textContent: selectedLabel })
          } else {
            span({ className: 'select-value select-placeholder', textContent: this.placeholder || '' })
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
    const { aeSelectOption } = tags as unknown as {
      aeSelectOption: (props: Record<string, unknown>) => HTMLElement
    }
    for (const opt of this.options) {
      if (this._isSelectOption(opt)) {
        const isSelected = this.value != null && String(opt.value) === String(this.value)
        aeSelectOption({
          key: `opt-${opt.value}`,
          value: String(opt.value),
          label: opt.label,
          textContent: t(opt.label, opt.label),
          ...(isSelected ? { selected: true } : {}),
        })
      } else {
        const isSelected = this.value != null && String(opt) === String(this.value)
        aeSelectOption({
          key: `opt-${opt}`,
          value: String(opt),
          textContent: String(opt),
          ...(isSelected ? { selected: true } : {}),
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
