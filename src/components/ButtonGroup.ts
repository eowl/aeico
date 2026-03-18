import type { InferProperties, Props } from '../core/types'
import buttonGroupStyle from '../assets/css/common/button-group.css?inline'
import AeicoComponent from './AeicoComponent'

/**
 * ButtonGroup Component
 *
 * Groups multiple `ae-button` elements, propagating shared `variant`, `color`,
 * `size`, and `disabled` props to each child. Supports a `compact` mode that
 * joins buttons into a seamless connected strip (like Bootstrap's button group).
 *
 * @example
 * ```html
 * <!-- Loose group (gap between buttons) -->
 * <ae-button-group variant="outlined" color="primary">
 *   <ae-button>One</ae-button>
 *   <ae-button>Two</ae-button>
 *   <ae-button>Three</ae-button>
 * </ae-button-group>
 *
 * <!-- Compact — joined strip -->
 * <ae-button-group compact color="primary">
 *   <ae-button>Left</ae-button>
 *   <ae-button>Middle</ae-button>
 *   <ae-button>Right</ae-button>
 * </ae-button-group>
 *
 * <!-- Full-width -->
 * <ae-button-group block color="danger" variant="outlined">
 *   <ae-button>Delete</ae-button>
 *   <ae-button>Archive</ae-button>
 * </ae-button-group>
 * ```
 */
class ButtonGroup extends AeicoComponent {
  static properties: Props = {
    variant:  { type: String },
    color:    { type: String },
    size:     { type: String },
    compact:  { type: Boolean },
    block:    { type: Boolean },
    disabled: { type: Boolean },
  }

  static readonly eventPrefix = 'button-group'

  protected static stylesheets = [buttonGroupStyle]

  declare variant?:  'filled' | 'outlined' | 'ghost' | 'text'
  declare color?:    'default' | 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info'
  declare size?:     'xs' | 'sm' | 'md' | 'lg'
  declare compact?:  boolean
  declare block?:    boolean
  declare disabled?: boolean

  private slotEl: HTMLSlotElement | null = null

  connectedCallback() {
    super.connectedCallback()

    if (this.variant === undefined) this.variant = 'filled'
    if (this.color === undefined) this.color = 'default'

    this.render()
  }

  protected updated(changedProps: Map<string, any>) {
    super.updated(changedProps)
    if (['variant', 'color', 'size', 'compact', 'disabled'].some(k => changedProps.has(k))) {
      this.syncChildren()
    }
  }

  protected render() {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = `<slot></slot>`
    this.slotEl = this.shadowRoot.querySelector('slot')
    this.slotEl?.addEventListener('slotchange', () => this.syncChildren())
    this.syncChildren()
  }

  private getButtons(): HTMLElement[] {
    if (!this.slotEl) return []
    return (this.slotEl.assignedElements({ flatten: true }) as HTMLElement[])
      .filter(el => el.tagName.toLowerCase() === 'ae-button')
  }

  private syncChildren() {
    const buttons  = this.getButtons()
    const variant  = this.variant  ?? 'filled'
    const color    = this.color    ?? 'default'
    const size     = this.size     ?? 'md'
    const r        = size === 'xs' || size === 'sm' ? 3 : 4

    buttons.forEach((btn, i) => {
      btn.setAttribute('variant', variant)
      btn.setAttribute('color',   color)
      btn.setAttribute('size',    size)

      if (this.disabled) {
        btn.setAttribute('disabled', '')
      }

      if (this.compact) {
        const isFirst = i === 0
        const isLast  = i === buttons.length - 1

        // Overlap adjacent borders by pulling non-first buttons left 1px
        btn.style.marginLeft = isFirst ? '' : '-1px'

        // Shape corners: only the outer edges of the strip keep radius
        btn.style.setProperty('--_btn-r-tl', isFirst  ? `${r}px` : '0')
        btn.style.setProperty('--_btn-r-bl', isFirst  ? `${r}px` : '0')
        btn.style.setProperty('--_btn-r-tr', isLast   ? `${r}px` : '0')
        btn.style.setProperty('--_btn-r-br', isLast   ? `${r}px` : '0')
      } else {
        btn.style.marginLeft = ''
        this.clearRadius(btn)
      }
    })
  }

  private clearRadius(btn: HTMLElement) {
    btn.style.removeProperty('--_btn-r-tl')
    btn.style.removeProperty('--_btn-r-tr')
    btn.style.removeProperty('--_btn-r-br')
    btn.style.removeProperty('--_btn-r-bl')
  }
}

if (!customElements.get('ae-button-group')) {
  ButtonGroup.register()
}

export default ButtonGroup
export type ButtonGroupProps = InferProperties<typeof ButtonGroup>
