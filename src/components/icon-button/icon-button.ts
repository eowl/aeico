import type { InferProps, Props } from '../../core/types'
import { SVG_NS } from '../../core/types'
import AeicoComponent from '../aeico-component'
import styleVariables from '../styles/variables.css?inline'
import sizeCSS from '../styles/size.css?inline'
import colorCSS from '../styles/color.css?inline'
import style from '../styles/components/icon-button.css?inline'
import type { IconColor } from '../icon/defines'
import IconRegistry from '../icon/registry'

export type IconButtonVariant = 'filled' | 'outlined' | 'subtle' | 'text'
export type IconButtonSize = 'xs' | 'sm' | 'md' | 'lg'

class IconButton extends AeicoComponent {
  static tagName = 'icon-button'

  static props: Props = {
    icon: { type: String },
    size: { type: String },
    color: { type: String },
    variant: { type: String },
    disabled: { type: Boolean },
  }

  declare icon?: string
  declare size?: IconButtonSize
  declare color?: IconColor
  declare variant?: IconButtonVariant
  declare disabled?: boolean

  protected static styles = [styleVariables, sizeCSS, colorCSS, style]

  protected render() {
    this.build(() => {
      const def = this.icon ? IconRegistry.get(this.icon) : undefined
      const { button, svg, path } = this.builder

      button({
        type: 'button',
        disabled: this.disabled,
        'aria-label': this.icon ?? '',
        part: 'button',
      }, () => {
        if (def) {
          svg({
            className: 'icon-svg',
            viewBox: def.viewBox,
            'aria-hidden': 'true',
            xmlns: SVG_NS,
          }, () => {
            path({ d: def.path })
          })
        }
      })
    })
  }
}

IconButton.register()

declare global {
  interface HTMLElementTagNameMap {
    'ae-icon-button': IconButton
  }
}

export default IconButton
export type IconButtonProps = InferProps<typeof IconButton>