import type { InferProps, Props } from '../core/types'
import alertStyle from '../assets/css/common/alert.css?inline'
import AeicoComponent from './aeico-component'

export type AlertVariant = 'subtle' | 'filled' | 'outlined'
export type AlertSize = 'sm' | 'md' | 'lg'
export type AlertColor = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark'

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
 * <ae-alert variant="warning" size="sm">Small warning</ae-alert>
 * ```
 */
class Alert extends AeicoComponent {
  static props: Props = {
    color: { type: String },
    variant: { type: String },
    size: { type: String },
    dismissible: { type: Boolean },
    invisible: { type: Boolean }
  }

  static readonly eventPrefix = 'alert'

  protected static useStyles = ['alert']
  protected static stylesheets = [alertStyle]

  declare color?: AlertColor
  declare variant?: AlertVariant
  declare size?: AlertSize
  declare dismissible?: boolean
  declare invisible?: boolean

  protected render() {
    this.build(() => {
      const { div, slot, button, span } = this.builder
      div({ 
        className: 'alert', 
        role: 'alert', 
        part: 'alert',
        style: { display: this.invisible ? 'none' : '' } 
      }, () => {
        slot()

        if (this.dismissible) {
          button({
            className: 'alert-close',
            onclick: () => this._handleClose(),
            title: this.t('alert.close', 'Close alert'),
          }, () => {
            span({ 'aria-hidden': 'true', textContent: '\u00d7' })
          })
        }
      })
    })
  }

  show() {
    if (this.invisible) {
      this.invisible = false
    }
  }

  hide() {
    this.invisible = true
  }

  private _handleClose = () => {
    this.emit('close', { target: this })
    this.remove()
  }
}

// Auto-register when this module is imported as side effect
if (!customElements.get('ae-alert')) {
  Alert.register()
}

export default Alert
export type AlertProps = InferProps<typeof Alert>
