import AeicoComponent from '../aeico-component'
import type { InferProps, Props } from '../../core/types'
import styleVariables from '../styles/variables.css?inline'
import colorCSS from '../styles/color.css?inline'
import style from '../styles/components/divider.css?inline'

class Divider extends AeicoComponent {
  static tagName = 'divider'

  static props: Props = {
    vertical: { type: Boolean },
    thickness: { type: String },
    color: { type: String },
  }

  declare vertical?: boolean
  declare thickness?: string
  declare color?: string

  protected static styles = [styleVariables, colorCSS, style]

  protected render(): void {
    if (this.thickness) {
      this.style.setProperty('--divider-thickness', this.thickness)
    } else {
      this.style.removeProperty('--divider-thickness')
    }
  }
}

Divider.register()

declare global {
  interface HTMLElementTagNameMap {
    'ae-divider': Divider
  }
}

export default Divider
export type DividerProps = InferProps<typeof Divider>