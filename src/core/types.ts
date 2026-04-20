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
 * Watcher handler: a method name string or an inline function
 */
export type WatcherHandler = string | ((newValue: unknown, oldValue: unknown) => void)

/**
 * Watchers declaration (property name -> method name or inline function)
 */
export type Watchers = Record<string, WatcherHandler>

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
 * Internal property keys excluded from InferProps output
 */
type InternalKeys = 'events'

/**
 * Helper to exclude function properties and internal properties
 */
type ExtractProperties<T> = {
  [K in keyof T as K extends InternalKeys
    ? never
    : T[K] extends (...args: any[]) => unknown
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
