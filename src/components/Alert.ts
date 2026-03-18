import type { InferProperties, Props } from '../core/types'
import alertStyle from '../assets/css/common/alert.css?inline'
import AeicoComponent from './AeicoComponent'


/**
 * Alert Component
 * 
 * A customizable alert/notification component with multiple variants and sizes.
 * Supports dismissible alerts and icon display.
 * 
 * @example
 * ```typescript
 * // Using the static create method
 * const alert = Alert.create({
 *   variant: 'info',
 *   dismissible: true
 * })
 * alert.textContent = 'This is an informational message'
 * document.body.appendChild(alert)
 * ```
 * 
 * @example
 * ```html
 * <!-- Using as Web Component -->
 * <ae-alert variant="info">Information message</ae-alert>
 * <ae-alert variant="success" dismissible>Operation successful!</ae-alert>
 * <ae-alert variant="danger" icon>Error occurred</ae-alert>
 * <ae-alert variant="warning" size="sm">Small warning</ae-alert>
 * ```
 */
class Alert extends AeicoComponent {
  static properties: Props = {
    color: { type: String },
    variant: { type: String },
    size: { type: String },
    dismissible: { type: Boolean },
    icon: { type: Boolean },
  }

  static readonly eventPrefix = 'alert'

  protected static useStyles = ['alert']
  protected static stylesheets = [alertStyle]

  declare color?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark'
  declare variant?: 'subtle' | 'filled' | 'outlined'
  declare size?: 'sm' | 'md' | 'lg'
  declare dismissible?: boolean
  declare icon?: boolean

  private closeButton: HTMLButtonElement | null = null
  private isVisible: boolean = true

  connectedCallback() {
    super.connectedCallback()

    this.render()
  }

  protected updated(changedProps: Map<string, any>) {
    super.updated(changedProps)
    // color/variant/size/icon are handled by :host([attr]) CSS — no re-render needed
    // dismissible changes the DOM structure (adds/removes close button)
    if (changedProps.has('dismissible')) {
      this.render()
    }
  }

  private handleClose() {
    this.isVisible = false
    this.emit('close', { target: this })
    this.remove()
  }

  protected render() {
    if (!this.shadowRoot || !this.isVisible) return

    this.shadowRoot.innerHTML = `
      <div class="alert" role="alert" part="alert">
        <slot></slot>
        ${this.dismissible ? `
          <button 
            class="alert-close" 
            type="button" 
            aria-label="Close"
            part="close-button"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        ` : ''}
      </div>
    `

    if (this.dismissible) {
      this.closeButton = this.shadowRoot.querySelector('.alert-close')
      if (this.closeButton) {
        this.closeButton.addEventListener('click', () => this.handleClose())
      }
    }
  }

  /**
   * Programmatically close/dismiss the alert
   */
  close() {
    this.handleClose()
  }

  /**
   * Show the alert (if it was hidden)
   */
  show() {
    if (!this.isVisible) {
      this.isVisible = true
      this.render()
    }
  }

  /**
   * Hide the alert (without removing from DOM)
   */
  hide() {
    if (this.shadowRoot) {
      const alertElement = this.shadowRoot.querySelector('.alert') as HTMLElement
      if (alertElement) {
        alertElement.style.display = 'none'
      }
    }
  }
}

// Auto-register when this module is imported as side effect
if (!customElements.get('ae-alert')) {
  Alert.register()
}

export default Alert
export type AlertProps = InferProperties<typeof Alert>
