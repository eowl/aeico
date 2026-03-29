/**
 * Components module exports
 * 
 * All Aeico Web Components are available here for on-demand registration.
 * Import only the components you need to keep your bundle size small.
 * 
 * @example
 * ```typescript
 * import { SelectField, RangeField, Button } from 'aeico/components'
 * 
 * // Manually register components
 * SelectField.register()
 * RangeField.register()
 * Button.register()
 * 
 * // Or use with custom names
 * SelectField.register('my-select')
 * ```
 * 
 * @example
 * ```typescript
 * // Use the static create method for programmatic creation
 * import { Button } from 'aeico/components'
 * 
 * const button = Button.create({
 *   variant: 'primary',
 *   size: 'md'
 * })
 * button.textContent = 'Click me'
 * document.body.appendChild(button)
 * ```
 */

// Field components
export { default as SelectField } from './select-field'
export { default as RangeField } from './range-field'
export { default as InputField } from './input-field'
export { default as CheckboxField } from './checkbox-field'
export { default as RadioField } from './radio-field'

export { default as Select } from './select'
export { default as Slider } from './slider'
export { default as Checkbox } from './checkbox'
export { default as RadioGroup } from './radio-group'

// UI components
export { default as Button } from './button'
export { default as ButtonGroup } from './button-group'
export { default as Alert } from './alert'
export { default as Modal } from './modal'
export { default as Icon } from './icon/icon'
export { default as IconRegistry } from './icon/registry'
export { default as IconButton } from './icon-button/icon-button'

// Component types
export type { SelectFieldProps } from './select-field'
export type { SelectProps, SelectOption, SelectOptions, SelectOptionValue } from './select'
export type { SliderProps, SliderOption, SliderOptions, SliderOptionValue } from './slider'
export type { CheckboxProps, CheckboxVariant } from './checkbox'
export type { RadioGroupProps, RadioGroupMode, RadioGroupOption, RadioGroupOptions } from './radio-group'
export type { RangeFieldProps } from './range-field'
export type { InputFieldProps } from './input-field'
export type { CheckboxFieldProps } from './checkbox-field'
export type { RadioFieldProps, RadioFieldType, RadioOption, RadioOptions } from './radio-field'
export type { ButtonProps } from './button'
export type { ButtonGroupProps } from './button-group'
export type { AlertProps } from './alert'
export type { ModalProps } from './modal'
export type { IconProps, IconSize, IconColor, IconDefinition, IconRegistryData } from './icon'
export type { IconButtonProps, IconButtonVariant, IconButtonSize } from './icon-button'
