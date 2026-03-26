import type { Constructor } from '../mixins/compose'
import { locale } from './store'

/**
 * Localizable Mixin
 */
export function Localizable<T extends Constructor>(Base: T) {
  return class extends Base {

    static props = {
      // ...( (Base as any).props || {} ),
      lang: { type: String, reflect: true },
      _localeTick: { type: Number, attribute: false }
    };

    declare lang: string;
    declare _localeTick: number;
    declare enableLocale?: boolean;

    _localeUnsubscribe: (() => void) | null = null;

    onLocaleChange(): void {}

    connectedCallback() {
      super.connectedCallback?.();
      
      this._localeTick = 0;
      this.lang = locale.lang;

      if (this.enableLocale !== false) {
        this._localeUnsubscribe = locale.subscribe(() => {
          this.lang = locale.lang;
          this._localeTick++;
          this.onLocaleChange?.();
        });
      }
    }

    disconnectedCallback() {
      this._localeUnsubscribe?.();
      this._localeUnsubscribe = null;
      super.disconnectedCallback?.();
    }

    t(key: string, fallback?: string): string {
      return locale.t(key, fallback);
    }
  };
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
