import AeicoComponent from '../aeico-component'
import type { InferProps } from '../../core/types'
import { html } from '../../view'
import { prop } from '../../decorators'
import type { ButtonColor, ButtonSize, ButtonVariant } from '../button/defines'
import type { DropdownPlacement } from './defines'
import type Dropdown from './dropdown'
import './dropdown'
import '../button/button'

/**
 * DropdownButton — a pre-composed trigger + dropdown panel.
 *
 * Renders an `ae-button`-styled trigger with a built-in chevron,
 * and a floating panel for `<ae-dropdown-item>` children.
 * Accepts the same `variant`, `color`, `size`, and `disabled` props
 * as `ae-button`, making it a drop-in inside `ae-button-group`.
 *
 * @example
 * ```html
 * <ae-dropdown-button variant="outlined" color="primary">
 *   Actions
 *   <ae-dropdown-item value="edit">Edit</ae-dropdown-item>
 *   <ae-dropdown-item value="delete">Delete</ae-dropdown-item>
 * </ae-dropdown-button>
 *
 * <!-- Inside ae-button-group -->
 * <ae-button-group compact color="primary">
 *   <ae-button>Save</ae-button>
 *   <ae-dropdown-button placement="bottom-end">
 *     <ae-dropdown-item value="draft">Save as draft</ae-dropdown-item>
 *     <ae-dropdown-item value="template">Save as template</ae-dropdown-item>
 *   </ae-dropdown-button>
 * </ae-button-group>
 * ```
 *
 * Emits:
 * - `open`   — when the panel opens
 * - `close`  — when the panel closes
 * - `select` — `{ detail: { value, label } }` when a menu item is selected
 */
class DropdownButton extends AeicoComponent {
  static tagName = 'dropdown-button'

  // ae-button and ae-dropdown each carry their own shadow DOM styles.
  // Only the host display is set here so button-group compact layout works.
  protected static styles = [':host { display: inline-block; }']

  @prop({ type: String })
  accessor variant: ButtonVariant = 'filled'

  @prop({ type: String })
  accessor color: ButtonColor = 'default'

  @prop({ type: String })
  accessor size: ButtonSize = 'md'

  @prop({ type: Boolean })
  accessor disabled: boolean = false

  @prop({ type: String })
  accessor placement: DropdownPlacement = 'bottom-start'

  @prop({ type: Boolean })
  accessor closeOnSelect: boolean = true

  private _dropdownEl: Dropdown | null = null

  show(): void { if (this.disabled) return; this._dropdownEl?.show() }
  hide(): void { this._dropdownEl?.hide() }
  toggle(): void { if (this.disabled) return; this._dropdownEl?.toggle() }

  get open(): boolean { return this._dropdownEl?.open ?? false }

  protected render() {
    return html(({ aeDropdown, aeButton, slot }) => {
      this._dropdownEl = aeDropdown({
        placement: this.placement,
        // false removes the attribute → ae-dropdown sees no attribute → closeOnSelect = false
        'close-on-select': this.closeOnSelect,
      }, () => {
        // ae-button in the trigger slot — ae-dropdown handles click-to-toggle and
        // auto-injects the direction arrow via _injectArrow()
        aeButton({
          slot: 'trigger',
          variant: this.variant,
          color: this.color,
          size: this.size,
          disabled: this.disabled || undefined,
        }, () => {
          slot({ name: 'label' })
        })
        // Slot forwarding: ae-dropdown-button's default-slot children (ae-dropdown-item
        // elements) are re-slotted into ae-dropdown's default slot via this <slot>.
        slot()
      }) as unknown as Dropdown
    })
  }
}

DropdownButton.register()

declare global {
  interface HTMLElementTagNameMap {
    'ae-dropdown-button': DropdownButton
  }
}

export default DropdownButton
export type DropdownButtonProps = InferProps<typeof DropdownButton>
