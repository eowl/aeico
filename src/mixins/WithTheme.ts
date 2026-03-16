import type { Constructor } from './compose'

/**
 * WithTheme Mixin
 * 
 * Adds theme support to a component, including:
 * - theme property for tracking current theme
 * - generateStyleVars() method for generating CSS custom properties
 * 
 * @example
 * ```typescript
 * import { WithTheme } from './mixins/WithTheme'
 * import AeicoElement from './AeicoElement'
 * 
 * class MyComponent extends WithTheme(AeicoElement) {
 *   // Override to customize style variables
 *   protected generateStyleVars() {
 *     return {
 *       '--my-color': this.theme === 'dark' ? '#fff' : '#000'
 *     }
 *   }
 * }
 * ```
 */
export function WithTheme<T extends Constructor>(Base: T) {
  return class extends Base {
    declare theme?: string

    /**
     * Generate CSS custom property values for this component instance.
     * Override this method in subclasses to provide custom style generation.
     * 
     * @returns Record of CSS custom properties and their values
     * 
     * @example
     * ```typescript
     * public generateStyleVars() {
     *   return {
     *     '--button-bg': this.theme === 'dark' ? '#333' : '#fff',
     *     '--button-color': this.theme === 'dark' ? '#fff' : '#000'
     *   }
     * }
     * ```
     */
    public generateStyleVars(): Record<string, string> {
      const constructor = this.constructor as any
      if (!constructor.styleGenerator) {
        return {}
      }

      return constructor.styleGenerator.generate({
        theme: this.theme,
      })
    }
  }
}

/**
 * Type augmentation for components using WithTheme
 */
export interface WithThemeInterface {
  theme?: string
  generateStyleVars(): Record<string, string>
}
