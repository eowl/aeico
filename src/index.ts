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
export { default as AeicoElement } from './core/AeicoElement'
export { default as AeicoField } from './components/AeicoField'
export type { AeicoElementProps } from './core/AeicoElement'
export type { AeicoFieldProps, FieldAction, FieldElement } from './components/AeicoField'

// Mixins
export { compose } from './mixins/compose'
export type { Constructor, Mixin } from './mixins/compose'
export { Themeable } from './mixins/Themeable'
export type { ThemeableProps } from './mixins/Themeable'
export { Localizable } from './mixins/Localizable'
export type { LocalizableProps } from './mixins/Localizable'

// Configuration & Services
export {
  setComponentConfig,
  getComponentConfig,
  hasComponentConfig,
  getConfigValue
} from './core/configProvider'
export type { ComponentConfig } from './core/configProvider'

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

// Utilities
export { default as styleStore } from './utils/styleStore'

