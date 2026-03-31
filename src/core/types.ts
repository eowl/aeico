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
}

/**
 * Scope of a stylesheet — where it should be applied.
 * 'document' → document.adoptedStyleSheets (CSS custom properties, global tokens)
 * 'shadow'   → component's shadow root (selectors, class rules)
 */
export type StyleScope = 'document' | 'shadow'

/**
 * Stylesheet descriptor — declarative stylesheet definition with scope and dependency tracking.
 *
 * Allows components to self-declare their CSS dependencies and where each stylesheet
 * should be applied, removing the need for external configuration to wire up global tokens.
 *
 * @example
 * export const variablesSpec: StyleSpec = {
 *   id: 'aeico:variables',
 *   code: variablesCss,
 *   scope: 'document',
 *   deps: []
 * }
 *
 * export const rangeFieldSpec: StyleSpec = {
 *   id: 'aeico:range-field',
 *   code: rangeFieldCss,
 *   scope: 'shadow',
 *   deps: [variablesSpec]
 * }
 */
export interface StyleSpec {
  /** Unique identifier, used for deduplication across component instances */
  id: string
  /** Raw CSS text */
  code: string
  /** 'document' → document.adoptedStyleSheets; 'shadow' → shadow root */
  scope: StyleScope
  /** Dependent specs to resolve before this one */
  deps?: StyleSpec[]
}

/**
 * Polymorphic stylesheet entry for `static stylesheets`.
 * - StyleSpec: full descriptor with scope and deps
 * - string: raw CSS text, defaults to shadow scope
 * - CSSStyleSheet: prebuilt sheet, defaults to shadow scope
 */
export type StyleEntry = StyleSpec | string | CSSStyleSheet

/**
 * Wrap a raw CSS string or CSSStyleSheet as a document-scoped StyleSpec.
 * Use this when you need to push ad-hoc styles to document.adoptedStyleSheets
 * without creating a named StyleSpec.
 *
 * @example
 * static stylesheets = [rangeFieldSpec, asDocument(globalTokenCss)]
 */
export function asDocument(css: string | CSSStyleSheet): StyleSpec {
  const code = typeof css === 'string'
    ? css
    : Array.from(css.cssRules).map(r => r.cssText).join('\n')
  return { id: `doc:${code.slice(0, 64)}`, code, scope: 'document', deps: [] }
}

/**
 * Re-export ComponentConfig from configProvider for convenience
 */
export type { ComponentConfig } from './config-provider'

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

  /** Whether to observe attribute changes to property (default: true) 
   * If false, this property will not exist in observedAttributes and attribute changes won't update the property value.
   * change property still triggers render and watchers
  */
  observe?: boolean

  /** Custom attribute name (default: kebab-case of property name) */
  attr?: string
  
  /** Custom parser for deserialization (from attribute) */
  parser?: (value: string | null, type?: PropertyType) => T
  
  /** Custom formatter for serialization (to attribute) */
  formatter?: (value: T, type?: PropertyType) => string | null
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
  [K in keyof T as T[K] extends (...args: any[]) => unknown
    ? never 
    : K extends 'events' | 'effectiveI18nConfig' | 'i18nEnabled' | 'i18nUnsubscribe'
    ? never 
    : K]: T[K]
}

/**
 * Infer complete properties type from class (including inherited)
 * 
 * Usage: type MyProps = InferProps<typeof MyClass>
 * 
 * @example
 * class SelectField extends AeicoField {
 *   static props = { options: { type: Array } }
 *   declare options?: any[]
 * }
 * 
 * type SelectFieldProps = InferProps<typeof SelectField>
 * // Result: { options?: any[], value?: string, defaultValue?: string, ... }
 */
export type InferProps<T extends new (...args: any[]) => any> = ExtractProperties<
  Omit<InstanceType<T>, keyof HTMLElement>
>

export const SVG_NS = 'http://www.w3.org/2000/svg'
