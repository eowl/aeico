import AeicoComponent from '../aeico-component'
import type { InferProps } from '../../core/types'
import { html } from '../../view'
import style from '../styles/components/dropdown-item.css?inline'
import variables from '../styles/variables.css?inline'
import { prop } from '../../decorators'
// Ensure ae-icon is registered when icons are used
import '../icon/icon'

/**
 * Dropdown menu item — used as a direct child of `<ae-dropdown>`.
 *
 * Renders as a `<button>` by default, or as an `<a>` anchor when `href` is set.
 * Use `<ae-icon>` inside to add icons, and CSS `color` / `--dropdown-item-color`
 * to apply danger or custom colours.
 *
 * @example
 * ```html
 * <ae-dropdown-item value="edit"><ae-icon name="edit"></ae-icon>Edit</ae-dropdown-item>
 * <ae-dropdown-item value="delete" style="--dropdown-item-color:var(--color-danger)">Delete</ae-dropdown-item>
 * <ae-dropdown-item href="/profile">Profile</ae-dropdown-item>
 * ```
 */
class DropdownItem extends AeicoComponent {
  static tagName = 'dropdown-item'

  /** Value emitted in the `select` event detail on the parent dropdown. */
  @prop({ type: String })
  accessor value: string | undefined

  /** Disables the item — it becomes non-interactive and visually dimmed. */
  @prop({ type: Boolean })
  accessor disabled: boolean = false

  /**
   * When set, the item renders as an `<a>` anchor element instead of a
   * `<button>`. Useful for navigation items.
   */
  @prop({ type: String })
  accessor href: string | undefined

  protected static styles = [variables, style]

  connectedCallback() {
    super.connectedCallback()
    this.listen('click', this._handleClick)
    this.setAttribute('role', 'menuitem')
  }

  private _handleClick = (e: Event): void => {
    if (this.disabled) {
      e.preventDefault()
      e.stopPropagation()
      return
    }
    const label = this.textContent?.trim() ?? ''
    this.dispatchEvent(new CustomEvent('_item-select', {
      bubbles: true,
      composed: true,
      detail: { value: this.value ?? '', label },
    }))
  }

  protected render() {
    return html(({ button, a, slot }) => {
      if (this.href) {
        a({
          part: 'item',
          className: 'item',
          href: this.disabled ? undefined : this.href,
          'aria-disabled': this.disabled || undefined,
        }, () => { slot() })
      } else {
        button({
          part: 'item',
          className: 'item',
          type: 'button',
          disabled: this.disabled,
        }, () => { slot() })
      }
    })
  }
}

DropdownItem.register()

declare global {
  interface HTMLElementTagNameMap {
    'ae-dropdown-item': DropdownItem
  }
}

export default DropdownItem
export type DropdownItemProps = InferProps<typeof DropdownItem>
