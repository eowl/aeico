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
export { default as AeicoElement } from './core/AeicoElement'
export { default as AeicoField } from './core/AeicoField'
export type { AeicoElementProps } from './core/AeicoElement'
export type { AeicoFieldProps, FieldAction, FieldElement } from './core/AeicoField'

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

