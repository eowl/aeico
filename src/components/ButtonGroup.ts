import type { InferProps, Props } from '../core/types'
import buttonGroupStyle from '../assets/css/common/button-group.css?inline'
import AeicoComponent from './AeicoComponent'
import type { ButtonColor, ButtonVariant, ButtonSize } from './Button'
import Button from './Button'

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
  static props: Props = {
    variant:  { type: String },
    color:    { type: String },
    size:     { type: String },
    compact:  { type: Boolean },
    block:    { type: Boolean },
    disabled: { type: Boolean },
  }

  static readonly eventPrefix = 'button-group'

  protected static stylesheets = [buttonGroupStyle]

  declare variant?:  ButtonVariant
  declare color?:    ButtonColor
  declare size?:     ButtonSize
  declare compact?:  boolean
  declare block?:    boolean
  declare disabled?: boolean

  private slotEl: HTMLSlotElement | null = null

  connectedCallback() {
    super.connectedCallback()

    if (this.variant === undefined) this.variant = 'filled'
    if (this.color === undefined) this.color = 'default'
    if (this.size === undefined) this.size = 'md'
  }

  protected render() {
    this.build(() => {
      const { slot } = this.builder
      
      this.slotEl = slot()
      this.slotEl.addEventListener('slotchange', () => this._syncChildren())
      this._syncChildren()
    })
  }

  private _getButtons(): Button[] {
    if (!this.slotEl) return []

    return (this.slotEl.assignedElements({ flatten: true }) as Button[])
      .filter(el => el.tagName.toLowerCase() === 'ae-button')
  }

  private _syncChildren() {
    const buttons  = this._getButtons()
    const r        = this.size === 'xs' || this.size === 'sm' ? 3 : 4

    buttons.forEach((btn: Button, i) => {
      btn.variant = this.variant
      btn.color = this.color
      btn.size = this.size

      if (this.disabled) {
        btn.disabled = true
      } else {
        btn.disabled = false
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
        this._clearRadius(btn)
      }
    })
  }

  private _clearRadius(btn: HTMLElement) {
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
export type ButtonGroupProps = InferProps<typeof ButtonGroup>
