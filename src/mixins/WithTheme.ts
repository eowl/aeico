import type { Constructor } from './compose'
import type { Props } from '../types'

/**
 * WithTheme Mixin
 * 
 * Adds theme support to a component via the theme attribute.
 * Theme switching is now handled purely via CSS using :host([theme]) selectors.
 * 
 * The theme property is automatically reflected to an HTML attribute, allowing
 * CSS rules like `:host([theme="light"])` to apply theme-specific styles.
 * 
 * @example
 * ```typescript
 * import { WithTheme } from './mixins/WithTheme'
 * import AeicoElement from './AeicoElement'
 * 
 * class MyComponent extends WithTheme(AeicoElement) {
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
export function WithTheme<T extends Constructor>(Base: T) {
  const ThemeClass = class extends Base {
    static properties: Props = {
      ...(Base as any).properties,
      theme: { type: String },
    }

    declare theme?: string
  }

  return ThemeClass
}

/**
 * Type augmentation for components using WithTheme
 */
export interface WithThemeInterface {
  theme?: string
}
