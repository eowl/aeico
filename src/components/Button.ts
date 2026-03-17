import type { InferProperties, Props } from '../core/types'
import buttonStyle from '../assets/css/common/button.css?inline'
import AeicoComponent from './AeicoComponent'

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
 * <ae-button variant="ghost">Cancel</ae-button>
 * ```
 */
class Button extends AeicoComponent {
  static properties: Props = {
    color: { type: String },
    variant: { type: String },
    size: { type: String },
    disabled: { type: Boolean },
    type: { type: String },
  }

  static readonly eventPrefix = 'button'

  protected static useStyles = ['button']
  protected static stylesheets = [buttonStyle]

  declare color?: 'default' | 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info'
  declare variant?: 'filled' | 'outlined' | 'ghost' | 'text'
  declare size?: 'xs' | 'sm' | 'md' | 'lg'
  declare disabled?: boolean
  declare type?: 'button' | 'submit' | 'reset'

  private buttonElement: HTMLButtonElement | null = null

  constructor() {
    super()
    this.addEventListener('click', this.handleClick.bind(this))
  }

  connectedCallback() {
    super.connectedCallback()
    // Set defaults so :host([attr]) CSS selectors match
    if (!this.hasAttribute('variant')) this.setAttribute('variant', 'filled')
    if (!this.hasAttribute('color')) this.setAttribute('color', 'default')
    if (!this.hasAttribute('size')) this.setAttribute('size', 'md')
    this.render()
  }

  protected updated(changedProps: Map<string, any>) {
    super.updated(changedProps)
    // color/variant/size are handled by :host([attr]) CSS — no re-render needed
    if (changedProps.has('disabled') && this.buttonElement) {
      this.buttonElement.toggleAttribute('disabled', !!this.disabled)
    }
    if (changedProps.has('type') && this.buttonElement) {
      this.buttonElement.type = this.type || 'button'
    }
  }

  private handleClick(event: Event) {
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
    if (!this.shadowRoot) return

    const type = this.type || 'button'

    this.shadowRoot.innerHTML = `
      <button 
        class="btn" 
        type="${type}"
        ${this.disabled ? 'disabled' : ''}
        part="button"
      >
        <slot></slot>
      </button>
    `

    this.buttonElement = this.shadowRoot.querySelector('button')
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
export type ButtonProps = InferProperties<typeof Button>
