import AeicoElement from '../../src/core/AeicoElement'
import type { Props } from '../../src/core/types'
import buttonStyle from '../../src/assets/css/common/button.css?inline'
import variablesStyle from '../../src/assets/css/common/variables.css?inline'

/**
 * Button component using innerHTML for rendering (baseline)
 */
class InnerHTMLButton extends AeicoElement {
  static props: Props = {
    color: { type: String },
    variant: { type: String },
    size: { type: String },
    disabled: { type: Boolean },
    type: { type: String },
  }

  protected static stylesheets = [variablesStyle, buttonStyle]

  declare color?: 'default' | 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info'
  declare variant?: 'filled' | 'outlined' | 'ghost' | 'text'
  declare size?: 'xs' | 'sm' | 'md' | 'lg'
  declare disabled?: boolean
  declare type?: 'button' | 'submit' | 'reset'

  private buttonElement: HTMLButtonElement | null = null

  connectedCallback() {
    super.connectedCallback()
    this.render()
  }

  protected onUpdated(changedProps: Map<string, any>) {
    super.onUpdated(changedProps)
    if (changedProps.has('disabled') || changedProps.has('type')) {
      this.render()
    }
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
}

export { InnerHTMLButton }
