import type { InferProps, Props } from '../../core/types'
import styleVariables from '../styles/variables.css?inline'
import sizeCSS from '../styles/size.css?inline'
import colorCSS from '../styles/color.css?inline'
import buttonStyle from '../styles/components/button.css?inline'
import AeicoComponent from '../aeico-component'
import { html } from '../../view'
import { ButtonColor, ButtonSize, ButtonVariant } from './defines'

/**
 * Button Component
 * 
 * A customizable button component with multiple variants and sizes.
 * Supports theme and internationalization through mixins.
 * 
 * @example
 * ```typescript
 * // Using the static create method
 * const button = Button.create({
 *   variant: 'primary',
 *   size: 'md'
 * })
 * ```
 * 
 * @example
 * ```html
 * <!-- Using as Web Component -->
 * <ae-button variant="primary" size="md">Save</ae-button>
 * <ae-button variant="danger" size="sm">Delete</ae-button>
 * <ae-button variant="subtle">Cancel</ae-button>
 * ```
 */
class Button extends AeicoComponent {
  static props: Props = {
    color: { type: String },
    variant: { type: String },
    size: { type: String },
    disabled: { type: Boolean },
    type: { type: String },
    active: { type: Boolean },
    block: { type: Boolean }
  }

  protected static styles = [styleVariables, sizeCSS, colorCSS, buttonStyle]

  declare color?: ButtonColor
  declare variant?: ButtonVariant
  declare size?: ButtonSize
  declare disabled?: boolean
  declare type?: 'button' | 'submit' | 'reset'
  declare active?: boolean
  declare block?: boolean

  private buttonElement: HTMLButtonElement | null = null
  private _autoAriaLabel = false

  protected onMounted() {
    const slot = this.shadowRoot?.querySelector('slot:not([name])')
    if (slot) this.listen(slot, 'slotchange', this._handleSlotChange)
    this._handleSlotChange()
  }

  private _handleSlotChange = () => {
    const slot = this.shadowRoot?.querySelector('slot:not([name])') as HTMLSlotElement | null
    const nodes = slot?.assignedNodes() ?? []
    // Icon-only: exactly one element (ae-icon) and no meaningful text nodes
    const elements = nodes.filter((n): n is Element => n.nodeType === Node.ELEMENT_NODE)
    const hasText = nodes.some(
      n => n.nodeType === Node.TEXT_NODE && n.textContent!.trim() !== ''
    )
    const isIconOnly =
      !hasText &&
      elements.length === 1 &&
      elements[0].tagName.toLowerCase() === 'ae-icon'

    if (isIconOnly) {
      this.setAttribute('icon-only', '')
      if (!this.hasAttribute('aria-label') || this._autoAriaLabel) {
        this.setAttribute('aria-label', elements[0].getAttribute('name') ?? '')
        this._autoAriaLabel = true
      }
    } else {
      this.removeAttribute('icon-only')
      if (this._autoAriaLabel) {
        this.removeAttribute('aria-label')
        this._autoAriaLabel = false
      }
    }
  }

  protected render() {
    return html(({ button, slot }) => {
      this.buttonElement = button({
        type: this.type || 'button',
        disabled: this.disabled,
        part: 'button',
        'aria-pressed': this.active,
        'aria-disabled': this.disabled
      }, () => {
        slot()
      })
    })
  }

  /**
   * Programmatically click the button
   */
  click() {
    if (!this.disabled && this.buttonElement) {
      this.buttonElement.click()
    }
  }

  /**
   * Focus the button
   */
  focus() {
    if (this.buttonElement) {
      this.buttonElement.focus()
    }
  }

  /**
   * Blur the button
   */
  blur() {
    if (this.buttonElement) {
      this.buttonElement.blur()
    }
  }

}

Button.register()

declare global {
  interface HTMLElementTagNameMap {
    'ae-button': Button
  }
}

export default Button
export type ButtonProps = InferProps<typeof Button>
