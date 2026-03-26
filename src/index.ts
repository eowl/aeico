/**
 * Aeico - Lightweight Web Components Library
 * 
 * Main entry point — exports core classes, mixins, configuration, and utilities.
 * 
 * ```typescript
 * import { AeicoElement, setComponentConfig, Themeable } from 'aeico'
 * import { SelectField, Button } from 'aeico/components'
 * ```
 * 
 * Note: Components are exported from `aeico/components`, not from `aeico`.
 */

// Base classes
export { default as AeicoBase } from './core/aeico-base'
export { default as AeicoElement } from './core/aeico-element'
export { default as AeicoField } from './components/aeico-field'
export type { AeicoBaseProps } from './core/aeico-base'
export type { AeicoElementProps } from './core/aeico-element'
export type { AeicoFieldProps, FieldAction, FieldElement } from './components/aeico-field'

// Mixins
export { compose } from './mixins/compose'
export type { Constructor, Mixin } from './mixins/compose'
export { Themeable } from './mixins/themeable'
export type { ThemeableProps } from './mixins/themeable'
export { Localizable, locale, LocaleStore, localeRegistry } from './localize/index'
export type { LocalizableProps, LocaleProvider, LocaleRegistry } from './localize/index'

// Configuration & Services
export {
  setComponentConfig,
  getComponentConfig,
  hasComponentConfig,
  getConfigValue
} from './core/config-provider'
export type { ComponentConfig } from './core/config-provider'

export { 
  setI18nService,
  getI18nService,
  hasI18nService
} from './core/i18n'

// Event system
export { createEventEmitter } from './core/events'
export type { ComponentEventEmitter } from './core/events'

// Types
export {
  isSelectOption
} from './core/types'
export type {
  ThemeType,
  SizeType,
  I18nKeys,
  I18nService,
  StyleProps,
  BaseProps,
  FieldI18nKeys,
  FieldConfig,
  DateTimeFieldI18nKeys,
  DateTimeFieldConfig,
  StyleVariableGenerator,
  StyleProvider,
  StyleGenerationConfig,
  SelectOption,
  SelectOptions
} from './core/types'

// ElementBuilder
export { default as ElementBuilder } from './core/element-builder'
export type { BuilderProps } from './core/element-builder'

// Utilities
export { default as styleStore } from './utils/style-store'

