import AeicoComponent from '../aeico-component'
import type { InferProps, Props } from '../../core/types'
import { html } from '../../view'
import style from '../styles/components/select-option.css?inline'
import variables from '../styles/variables.css?inline'

class SelectOption extends AeicoComponent {
  static tagName = 'select-option'

  static props: Props = {
    value: { type: String },
    label: { type: String },
    disabled: { type: Boolean },
    selected: { type: Boolean },
  }

  declare value?: string
  declare label?: string
  declare disabled?: boolean
  declare selected?: boolean

  protected static styles = [variables, style]

  connectedCallback() {
    super.connectedCallback()
    this.addEventListener('click', this._handleClick)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    this.removeEventListener('click', this._handleClick)
  }

  private _handleClick = (e: Event): void => {
    if (this.disabled) {
      e.stopPropagation()
      return
    }
    const displayLabel = this.label || this.textContent?.trim() || ''
    this.dispatchEvent(
      new CustomEvent('selectoption', {
        bubbles: true,
        composed: true,
        detail: { value: this.value ?? '', label: displayLabel },
      })
    )
  }

  render() {
    return html(({ div, slot }) => {
      div({ className: 'option-item' }, () => {
        slot()
      })
    })
  }
}

SelectOption.register()

declare global {
  interface HTMLElementTagNameMap {
    'ae-select-option': SelectOption
  }
}

export default SelectOption
export type SelectOptionProps = InferProps<typeof SelectOption>
