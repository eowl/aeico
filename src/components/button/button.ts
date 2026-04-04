import type { InferProps, Props } from '../../core/types'
import styleVariables from '../styles/variables.css?inline'
import sizeCSS from '../styles/size.css?inline'
import buttonStyle from '../styles/components/button.css?inline'
import AeicoComponent from '../aeico-component'
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
  }

  static readonly eventPrefix = 'button'

  protected static useStyles = ['button']
  protected static styles = [styleVariables, sizeCSS, buttonStyle]

  declare color?: ButtonColor
  declare variant?: ButtonVariant
  declare size?: ButtonSize
  declare disabled?: boolean
  declare type?: 'button' | 'submit' | 'reset'

  private buttonElement: HTMLButtonElement | null = null

  constructor() {
    super()
    this.addEventListener('click', this._handleClick)
  }

  private _handleClick = (event: Event) => {
    if (this.disabled) {
      event.preventDefault()
      event.stopPropagation()

      return
    }

    this.emit('click', { 
      variant: this.variant,
      target: this 
    })
  }

  protected render() {
    if (this.buttonElement) return

    this.build(() => {
      const { button, slot } = this.builder

      button({
        type: this.type || 'button',
        disabled: this.disabled,
        part: 'button'
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

// Auto-register when this module is imported as side effect
if (!customElements.get('ae-button')) {
  Button.register()
}

export default Button
export type ButtonProps = InferProps<typeof Button>
