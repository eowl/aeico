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
export { default as SelectField } from './SelectField'
export { default as RangeField } from './RangeField'
export { default as InputField } from './InputField'
export { default as CheckboxField } from './CheckboxField'
export { default as RadioField } from './RadioField'

// UI components
export { default as Button } from './Button'
export { default as Alert } from './Alert'
export { default as Modal } from './Modal'

// Component types
export type { SelectFieldProps } from './SelectField'
export type { RangeFieldProps } from './RangeField'
export type { InputFieldProps } from './InputField'
export type { CheckboxFieldProps } from './CheckboxField'
export type { RadioFieldProps, RadioFieldType, RadioOption, RadioOptions } from './RadioField'
export type { ButtonProps } from './Button'
export type { AlertProps } from './Alert'
export type { ModalProps } from './Modal'
