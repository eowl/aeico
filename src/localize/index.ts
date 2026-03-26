/**
 * Localize module
 * 
 * Provides internationalization support for Aeico components.
 * 
 * @example
 * ```typescript
 * import { Localizable, locale } from 'aeico/localize'
 * import { AeicoElement } from 'aeico'
 * 
 * class MyComponent extends Localizable(AeicoElement) {
 *   render() {
 *     return this.t('buttons.save', 'Save')
 *   }
 * }
 * 
 * // Load translations
 * locale.update('zh-CN', { buttons: { save: '保存' } })
 * ```
 */

export { Localizable } from './localizable'
export type { LocalizableProps } from './localizable'

export { locale, LocaleStore, localeRegistry } from './store'
export type { LocaleProvider, LocaleRegistry } from './store'
