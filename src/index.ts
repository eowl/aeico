/**
 * Aeico - Lightweight Web Components Library
 * 
 * Main entry point — exports core classes, mixins, configuration, and utilities.
 * 
 * ```typescript
 * import { AeicoElement, setComponentConfig, WithTheme } from 'aeico'
 * import { SelectField, Button } from 'aeico/components'
 * ```
 * 
 * Note: Components are exported from `aeico/components`, not from `aeico`.
 */

// Base classes
export { default as AeicoElement } from './AeicoElement'
export { default as AeicoField } from './AeicoField'
export type { AeicoElementProps } from './AeicoElement'
export type { AeicoFieldProps, FieldAction, FieldElement } from './AeicoField'

// Mixins
export { compose } from './mixins/compose'
export type { Constructor, Mixin } from './mixins/compose'
export { WithTheme } from './mixins/WithTheme'
export type { WithThemeInterface } from './mixins/WithTheme'
export { WithI18n } from './mixins/WithI18n'
export type { WithI18nInterface } from './mixins/WithI18n'

// Configuration & Services
export {
  setComponentConfig,
  getComponentConfig,
  hasComponentConfig,
  getConfigValue
} from './configProvider'
export type { ComponentConfig } from './configProvider'

export { 
  setI18nService,
  getI18nService,
  hasI18nService
} from './i18n'

// Event system
export { createEventEmitter } from './events'
export type { ComponentEventEmitter } from './events'

// Types
export {
  isSelectOption
} from './types'
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
} from './types'

// Utilities
export { default as styleStore } from './utils/styleStore'

