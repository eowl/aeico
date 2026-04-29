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
 *
 * @example
 * ```html
 * <ae-dropdown-item value="edit" icon="edit">Edit</ae-dropdown-item>
 * <ae-dropdown-item value="delete" danger icon="trash">Delete</ae-dropdown-item>
 * <ae-dropdown-item href="/profile" icon="user">Profile</ae-dropdown-item>
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

  /** Icon name passed to `<ae-icon>`, displayed before the label text. */
  @prop({ type: String })
  accessor icon: string | undefined

  /**
   * When set, the item renders as an `<a>` anchor element instead of a
   * `<button>`. Useful for navigation items.
   */
  @prop({ type: String })
  accessor href: string | undefined

  /** Applies danger (red) colour styling — intended for destructive actions. */
  @prop({ type: Boolean })
  accessor danger: boolean = false

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
    const hasIcon = Boolean(this.icon)
    return html(({ div, button, a, aeIcon, span, slot }) => {
      if (this.href) {
        a({
          part: 'item',
          className: 'item',
          href: this.disabled ? undefined : this.href,
          'aria-disabled': this.disabled || undefined,
        }, () => {
          if (hasIcon) {
            div({ className: 'icon-wrapper' }, () => {
              aeIcon({ name: this.icon })
            })
          }
          span({ className: 'label' }, () => {
            slot()
          })
        })
      } else {
        button({
          part: 'item',
          className: 'item',
          type: 'button',
          disabled: this.disabled,
        }, () => {
          if (hasIcon) {
            div({ className: 'icon-wrapper' }, () => {
              aeIcon({ name: this.icon })
            })
          }
          span({ className: 'label' }, () => {
            slot()
          })
        })
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
