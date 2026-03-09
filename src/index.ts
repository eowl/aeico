/**
 * Aeico - Lightweight Web Components Library
 * 
 * Main entry point for the Aeico components library.
 * Exports all components, utilities, types, and configuration functions.
 */

// Import field components to trigger registration side effects
import './components/SelectField'
import './components/RangeField'
import './components/InputField'
import './components/CheckboxField'
import './components/Modal'

// Base components
export { default as AeicoElement } from './AeicoElement'
export { default as AeicoField } from './AeicoField'
export type { AeicoElementProps } from './AeicoElement'
export type { AeicoFieldProps, FieldAction, FieldElement } from './AeicoField'

// Components
export { default as SelectField } from './components/SelectField'
export { default as RangeField } from './components/RangeField'
export { default as InputField } from './components/InputField'
export { default as CheckboxField } from './components/CheckboxField'
export { default as Modal } from './components/Modal'
export type { SelectFieldProps } from './components/SelectField'
export type { RangeFieldProps } from './components/RangeField'
export type { InputFieldProps } from './components/InputField'
export type { CheckboxFieldProps } from './components/CheckboxField'
export type { ModalProps } from './components/Modal'

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
export { default as styleSheetLoader } from './utils/styleSheetLoader'
export {
  createFieldCssVars,
  mergeFieldCssVars,
  fieldStyleGenerator
} from './utils/fieldStyles'
export type {
  FieldSize,
  FieldTheme,
  FieldStyleOptions
} from './utils/fieldStyles'
