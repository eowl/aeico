import type { Constructor } from './compose'
import type { Props } from '../types'

/**
 * Themeable Mixin
 * 
 * Adds theme support to a component via the theme attribute.
 * Theme switching is now handled purely via CSS using :host([theme]) selectors.
 * 
 * The theme property is automatically reflected to an HTML attribute, allowing
 * CSS rules like `:host([theme="light"])` to apply theme-specific styles.
 * 
 * @example
 * ```typescript
 * import { Themeable } from './mixins/Themeable'
 * import AeicoElement from './AeicoElement'
 * 
 * class MyComponent extends Themeable(AeicoElement) {
 *   // theme property is automatically available
 * }
 * 
 * // Usage:
 * <my-component theme="light"></my-component>
 * // or
 * MyComponent.create({ theme: 'light' })
 * ```
 * 
 * @example CSS
 * ```css
 * :host {
 *   --bg: var(--surface-base);  // Default (dark theme)
 * }
 * 
 * :host([theme="light"]) {
 *   --bg: #ffffff;  // Light theme override
 * }
 * ```
 */
export function Themeable<T extends Constructor>(Base: T) {
  return class extends Base {
    static props: Props = {
      ...(Base as unknown as { properties?: Props }).properties,
      theme: { type: String },
    }

    declare theme?: string
  }

}

/**
 * Type augmentation for components using Themeable
 */
export type ThemeableProps = {
  theme?: string
}

