import BaseElement from './BaseElement'
import type { Props, InferProperties } from './types'

/**
 * AeicoBase — public lightweight base class for building Web Components
 * without the Aeico style system.
 *
 * Provides:
 * - Reactive property system (static properties / watchers / computed)
 * - Batched update lifecycle (onPrepare → render → onUpdated (+ onMounted*))
 * - Event system (emit / events)
 * - Custom element registration (register / toKebab)
 * - `disabled` property (common to all UI components)
 *
 * Use this when you want the Aeico reactivity engine but manage styles yourself,
 * or when building utility components with no visual output.
 *
 * For components that use the Aeico style system (adoptedStyleSheets, CSS variables,
 * theme integration), extend AeicoElement instead.
 *
 * @example
 * ```typescript
 * import { AeicoBase } from 'aeico/core'
 *
 * class MyCounter extends AeicoBase {
 *   static properties: Props = {
 *     count: { type: Number }
 *   }
 *   declare count?: number
 *
 *   render() {
 *     this.shadowRoot!.innerHTML = `<span>${this.count ?? 0}</span>`
 *   }
 * }
 * MyCounter.register()  // registers as 'my-counter'
 * ```
 */
class AeicoBase extends BaseElement {
  static properties: Props = {
    disabled: { type: Boolean },
  }

  declare disabled?: boolean
}

export default AeicoBase
export type AeicoBaseProps = InferProperties<typeof AeicoBase>
