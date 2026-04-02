import type { InferProps, Props } from '../../core/types'
import { SVG_NS } from '../../core/types'
import AeicoComponent from '../aeico-component'
import styleVariables from '../styles/variables.css?inline'
import style from '../styles/components/icon.css?inline'
import type { IconSize, IconColor } from './defines'
import IconRegistry from './registry'


class Icon extends AeicoComponent {
  static tagName = 'icon'

  static props: Props = {
    name: { type: String },
    size: { type: String },
    color: { type: String },
  }

  declare name?: string
  declare size?: IconSize
  declare color?: IconColor

  protected static styles = [styleVariables, style]

  protected render() {
    if (typeof this.size === 'number' && this.size > 0) {
      this.style.setProperty('--icon-size', `${this.size}px`)
    } else {
      this.style.removeProperty('--icon-size')
    }

    this.build(() => {
      const def = this.name ? IconRegistry.get(this.name) : undefined
      if (!def) return

      const { svg, path } = this.builder
      svg({
        className: 'icon-svg',
        viewBox: def.viewBox,
        'aria-hidden': 'true',
        xmlns: SVG_NS,
      }, () => {
        path({ d: def.path })
      })
    })
  }
}

export default Icon
export type IconProps = InferProps<typeof Icon>
