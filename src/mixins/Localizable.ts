import type { Constructor } from './compose'
import { getComponentConfig } from '../core/config-provider'

/**
 * Localizable Mixin
 * 
 * Adds internationalization support to a component, including:
 * - enableI18n property for controlling i18n feature
 * - i18n property for custom translations
 * - t() method for translating keys
 * - onLanguageChange() lifecycle hook
 * - Automatic subscription to language changes
 * 
 * @example
 * ```typescript
 * import { Localizable } from './mixins/Localizable'
 * import AeicoElement from './AeicoElement'
 * 
 * class MyComponent extends Localizable(AeicoElement) {
 *   render() {
 *     this.shadowRoot.innerHTML = `
 *       <button>${this.t('buttons.save', 'Save')}</button>
 *     `
 *   }
 * 
 *   protected onLanguageChange() {
 *     super.onLanguageChange()
 *     this.render() // Re-render with new translations
 *   }
 * }
 * ```
 */
export function Localizable<T extends Constructor>(Base: T) {
  return class extends Base {
    declare enableI18n?: boolean
    declare i18n?: Record<string, unknown>

    /**
     * Unsubscribe function for i18n language change listener
     */
    i18nUnsubscribe: (() => void) | null = null

    /**
     * Get effective i18n configuration (global + instance overrides)
     */
    get effectiveI18nConfig() {
      const globalConfig = getComponentConfig()
      return {
        enableI18n: this.enableI18n ?? globalConfig?.enableI18n ?? false,
        i18nService: globalConfig?.i18nService
      }
    }

    /**
     * Check if i18n is enabled for this component
     */
    get i18nEnabled(): boolean {
      return this.effectiveI18nConfig.enableI18n
    }

    /**
     * Lifecycle: Component connected to DOM
     * Automatically subscribes to i18n language changes if enabled
     */
    connectedCallback() {
      super.connectedCallback?.()

      if (this.i18nEnabled) {
        this.subscribeToI18n()
      }
    }

    /**
     * Lifecycle: Component disconnected from DOM
     * Automatically unsubscribes from i18n language changes
     */
    disconnectedCallback() {
      super.disconnectedCallback?.()
      this.unsubscribeFromI18n()
    }

    /**
     * Subscribe to i18n language changes
     */
    subscribeToI18n() {
      const i18nService = this.effectiveI18nConfig?.i18nService
      if (i18nService) {
        this.i18nUnsubscribe = i18nService.subscribe(() => {
          this.onLanguageChange()
        })
      }
    }

    /**
     * Unsubscribe from i18n language changes
     */
    unsubscribeFromI18n() {
      if (this.i18nUnsubscribe) {
        this.i18nUnsubscribe()
        this.i18nUnsubscribe = null
      }
    }

    /**
     * Handle language change event
     * Override in subclass to update UI with new translations
     * 
     * Remember to call super.onLanguageChange() if you override this method
     * 
     * @example
     * ```typescript
     * protected onLanguageChange() {
     *   super.onLanguageChange()
     *   this.render() // Re-render with new translations
     * }
     * ```
     */
    onLanguageChange() {
      // Base implementation - subclasses can override
    }

    /**
     * Get translated text for a key
     * 
     * @param key Translation key
     * @param fallback Fallback text if i18n service is not available
     * @returns Translated text or fallback
     * 
     * @example
     * ```typescript
     * const text = this.t('buttons.save', 'Save')
     * ```
     */
    t(key: string, fallback?: string): string {
      const i18nService = this.effectiveI18nConfig?.i18nService
      if (i18nService) {
        return i18nService.t(key)
      }
      
      return fallback || key
    }
  }
}

/**
 * Type augmentation for components using Localizable
 */
export type LocalizableProps = {
  enableI18n?: boolean
  i18n?: Record<string, unknown>
  i18nEnabled: boolean
  t(key: string, fallback?: string): string
  onLanguageChange(): void
}
