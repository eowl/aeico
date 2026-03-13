/**
 * Base i18n keys configuration for any component
 * Extend this type to add component-specific i18n keys
 */
export type I18nKeys = Record<string, string | undefined>

/**
 * i18n Service Interface
 * 
 * The framework interacts with the multilingual system via this interface. 
 * The actual implementation is provided by the application layer.
 */
export type I18nService = {
  /**
   * Translate text
   * @param key Translation key
   * @returns Translated text
   */
  t(key: string): string

  /**
   * Subscribe to language changes
   * @param callback Callback function when language changes
   * @returns Unsubscribe function
   */
  subscribe(callback: () => void): () => void
}

/**
 * Theme types for components
 */
export type ThemeType = 'dark' | 'light'

/**
 * Size types for field components
 */
export type SizeType = 'sm' | 'md' | 'lg'

/**
 * Style configuration for components
 */
export type StyleProps = {
  /** Whether to use component's default stylesheet, defaults to true */
  useDefaultStyleSheet?: boolean
  styleSheetText?: string
  styleSheet?: CSSStyleSheet
  styleSheetNames?: string[]
  cssVars?: Record<string, string>
  
  /** Component theme, defaults to 'dark' */
  theme?: ThemeType
}

/**
 * Base configuration for all components
 * Provides common styling and behavior options
 */
export type BaseProps<TI18nKeys extends I18nKeys = I18nKeys> = StyleProps & {
  /** Whether to enable i18n support for this component instance. If undefined, uses AeicoElement.enableI18n */
  enableI18n?: boolean
  disabled?: boolean
  
  /** i18n keys for translatable UI elements */
  i18n?: TI18nKeys
}

/**
 * i18n keys configuration for field components
 */
export type FieldI18nKeys = I18nKeys & {
  /** i18n key for reset button tooltip, defaults to 'buttons.reset' */
  resetButton?: string
  /** i18n key for clear button tooltip */
  clearButton?: string
}

/**
 * Configuration for form field components
 */
export type FieldConfig = BaseProps<FieldI18nKeys> & {
  value?: string | number
  defaultValue?: string | number
  resettable?: boolean
  clearable?: boolean
}

/**
 * i18n keys configuration for date-time field
 */
export type DateTimeFieldI18nKeys = FieldI18nKeys & {
  /** i18n key for clear button tooltip */
  clearButton?: string
}

export type DateTimeFieldConfig = FieldConfig & {
  options?: string[]
  clearable?: boolean
}

/**
 * Style variable generator type
 * Components can implement this to provide automatic style generation based on props
 */
export type StyleVariableGenerator = {
  /**
   * Generate CSS variables based on component configuration
   * 
   * @param config Configuration object containing size, theme, and other properties
   * @returns CSS variables object (keys start with '--')
   * 
   * @example
   * ```typescript
   * generate({ size: 'md', theme: 'dark' })
   * // Returns: { '--input-font-size': '12px', '--input-bg': '#1e1e1e', ... }
   * ```
   */
  generate(config: Record<string, any>): Record<string, string>
}

/**
 * Style provider for components
 * Combines static stylesheet and dynamic variable generator
 * 
 * Components define stylesheet and/or styleGenerator as static properties,
 * and AeicoElement automatically combines them into a complete style system
 */
export type StyleProvider = {
  /** Static CSS stylesheet content */
  stylesheet?: string
  
  /** Dynamic CSS variable generator */
  generator?: StyleVariableGenerator
}

/**
 * Configuration for style generation
 */
export type StyleGenerationConfig = {
  /** Component theme (e.g., 'dark', 'light') */
  theme?: string
  
  /** Component size (e.g., 'sm', 'md', 'lg') */
  size?: string
  
  /** Additional custom properties */
  [key: string]: any
}

/**
 * Re-export ComponentConfig from configProvider for convenience
 */
export type { ComponentConfig } from './configProvider'

/**
 * Select option type for SelectField and related components
 */
export type SelectOption = {
  label: string
  value: string | number
}

/**
 * Type guard for SelectOption
 */
export function isSelectOption(option: unknown): option is SelectOption {
  return (
    typeof option === 'object' &&
    option !== null &&
    'label' in option &&
    'value' in option &&
    typeof (option as SelectOption).label === 'string' &&
    (typeof (option as SelectOption).value === 'string' ||
      typeof (option as SelectOption).value === 'number')
  )
}

/**
 * Select options type - can be simple values or option objects
 */
export type SelectOptions = (string | number)[] | SelectOption[]

/**
 * Property type constructors (similar to Lit)
 */
export type PropertyType = 
  | StringConstructor
  | NumberConstructor
  | BooleanConstructor
  | ArrayConstructor
  | ObjectConstructor

/**
 * Property declaration with metadata
 */
export interface Prop<T = any> {
  /** Property type constructor */
  type?: PropertyType
  
  /** Whether to reflect property to attribute (default: true) */
  reflect?: boolean
  
  /** Custom attribute name (default: kebab-case of property name) */
  attribute?: string | false
  
  /** Custom converter for serialization/deserialization */
  converter?: {
    fromAttribute?: (value: string | null, type?: PropertyType) => T
    toAttribute?: (value: T, type?: PropertyType) => string | null
  }
}

/**
 * Properties declaration object
 */
export type Props = Record<string, Prop>

/**
 * Computed property configuration
 */
export interface ComputedPropertyConfig<T = any> {
  /** Dependent property names */
  deps: string[]
  /** Compute function */
  compute: (self: any) => T
}

/**
 * Computed properties declaration
 */
export type ComputedDeclaration = Record<string, ComputedPropertyConfig>

/**
 * Watchers declaration (property name -> method name)
 */
export type Watchers = Record<string, string>

/**
 * Convert PropertyType to TypeScript type
 */
export type PropertyTypeToTS<T extends PropertyType | undefined> =
  T extends StringConstructor ? string :
  T extends NumberConstructor ? number :
  T extends BooleanConstructor ? boolean :
  T extends ArrayConstructor ? any[] :
  T extends ObjectConstructor ? Record<string, any> :
  any

/**
 * Helper to exclude function properties and internal properties
 */
type ExtractProperties<T> = {
  [K in keyof T as T[K] extends Function 
    ? never 
    : K extends 'events' 
    ? never 
    : K]: T[K]
}

/**
 * Infer complete properties type from class (including inherited)
 * 
 * Usage: type MyProps = InferProperties<typeof MyClass>
 * 
 * @example
 * class SelectField extends AeicoField {
 *   static properties = { options: { type: Array } }
 *   declare options?: any[]
 * }
 * 
 * type SelectFieldProps = InferProperties<typeof SelectField>
 * // Result: { options?: any[], value?: string, defaultValue?: string, ... }
 */
export type InferProperties<T extends new (...args: any[]) => any> = ExtractProperties<
  Omit<InstanceType<T>, keyof HTMLElement>
>
