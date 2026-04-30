/**
 * Localize module
 *
 * Provides internationalization support for Aeico components.
 *
 * @example
 * ```typescript
 * import { t, locale } from 'aeico/localize'
 *
 * class MyComponent extends AeicoElement {
 *   render() {
 *     this.build(() => {
 *       this.builder.button({ textContent: t('buttons.save', 'Save') })
 *     })
 *   }
 * }
 *
 * // Load translations
 * locale.update('zh-CN', { buttons: { save: '保存' } })
 * ```
 */

export { t } from './locale';

export { locale, LocaleStore, localeRegistry } from './locale';
export type { LocaleProvider, LocaleRegistry } from './locale';
