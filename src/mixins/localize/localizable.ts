import type { Constructor } from '../compose'
import { localeRegistry, LocaleProvider } from './registry'

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
    
    static props = {
      enableI18n: { type: Boolean },
      i18n: { type: Object },
      lang: { type: String },
      _localeTick: { type: Number, attribute: false, reflect: false }
    }

    declare i18n?: Record<string, unknown>
    declare enableLocale?: boolean;
    declare lang?: string
    declare _localeTick: number

    /**
     * Unsubscribe function for i18n language change listener
     */
    _localeUnsubscribe: (() => void) | null = null;
    _provider: LocaleProvider | null = null;

    /**
     * Lifecycle: Component connected to DOM
     * Automatically subscribes to i18n language changes if enabled
     */
    connectedCallback() {
      super.connectedCallback?.();

      this._localeTick = 0;

      this._provider = localeRegistry.provider;;
      
      if (this.lang) {
        this.lang = this._provider?.lang || '';
      }

      if (this.enableLocale !== false && this._provider) {
        this._localeUnsubscribe = this._provider.subscribe(() => {
          this._handleLocaleChange();
        });
      }
    }

    _handleLocaleChange() {
      if (this._provider) {
        this.lang = this._provider.lang || '';
      }

      this._localeTick++;
      
      if (typeof this.onLocaleChange === 'function') {
        this.onLocaleChange();
      }
    }

    /**
     * Lifecycle: Component disconnected from DOM
     * Automatically unsubscribes from i18n language changes
     */
    disconnectedCallback() {
      if (this._localeUnsubscribe) {
        this._localeUnsubscribe();
        this._localeUnsubscribe = null;
      }
      super.disconnectedCallback?.();
    }


    /**
     * Handle language change event
     * Override in subclass to update UI with new translations
     * 
     * Remember to call super.onLocaleChange() if you override this method
     * 
     * @example
     * ```typescript
     * protected onLocaleChange() {
     *   super.onLocaleChange()
     * }
     * ```
     */
    onLocaleChange?(): void;

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
      const provider = localeRegistry.provider;

      return provider?.t(key) ?? fallback ?? key;
    }
  }
}

/**
 * Type augmentation for components using Localizable
 */
export type LocalizableProps = {
  i18n?: Record<string, unknown>
  enableLocale?: boolean
  t(key: string, fallback?: string): string
  onLocaleChange(): void
}
