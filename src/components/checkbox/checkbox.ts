import AeicoField from '../aeico-field'
import type { InferProps, Props } from '../../core/types'
import styleVariables from '../styles/variables.css?inline'
import styles from '../styles/components/checkbox.css?inline'
import { CheckboxVariant } from './defines'

class Checkbox extends AeicoField {
  protected fieldElement: HTMLInputElement | null = null

  static tagName = 'checkbox'

  static props: Props = {
    checked: { type: Boolean },
    defaultChecked: { type: Boolean },
    variant: { type: String },
  }

  declare checked?: boolean
  declare defaultChecked?: boolean
  declare variant?: CheckboxVariant

  protected static styles = [styleVariables, styles]

  protected getValue(): boolean {
    return this.fieldElement?.checked ?? false
  }

  protected writeValue(checked: boolean): void {
    if (this.fieldElement) {
      this.fieldElement.checked = Boolean(checked)
    }
  }

  protected getEventPayload(checked: boolean, oldChecked: boolean, action: any) {
    return { checked, oldChecked, action }
  }

  protected setValue(checked: boolean, options?: { silent?: boolean; action?: any }): void {
    const oldChecked = this.getValue()
    this.checked = checked
    this.writeValue(checked)
    if (options?.silent === false) {
      this.emit('change', this.getEventPayload(checked, oldChecked, options.action || 'change'))
    }
  }

  public reset(checked?: boolean, options?: { silent?: boolean }): void {
    this.setValue(checked !== undefined ? checked : (this.defaultChecked ?? false), { ...options, action: 'reset' })
  }

  public clear(options?: { silent?: boolean }): void {
    this.setValue(false, { ...options, action: 'clear' })
  }

  render() {
    const { div, input, span } = this.builder
    this.build(() => {
      div({ className: 'checkbox-container', variant: this.variant }, () => {
        div({ className: 'checkbox-wrapper' }, () => {
          this.fieldElement = input({
            type: 'checkbox',
            className: 'field-input',
            checked: Boolean(this.checked),
            disabled: Boolean(this.disabled),
            onChange: this.boundOnChange,
          }) as HTMLInputElement
          if (this.variant === 'toggle') {
            span({ className: 'toggle-slider' })
          }
        })
        this.renderActionButtonsTags()
      })
    })
  }
}

export default Checkbox
export type CheckboxProps = InferProps<typeof Checkbox>
