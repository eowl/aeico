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
export { default as SelectField } from './components/SelectField'
export { default as RangeField } from './components/RangeField'
export { default as InputField } from './components/InputField'
export { default as CheckboxField } from './components/CheckboxField'
export { default as RadioField } from './components/RadioField'

// UI components
export { default as Button } from './components/Button'
export { default as Alert } from './components/Alert'
export { default as Modal } from './components/Modal'

// Component types
export type { SelectFieldProps } from './components/SelectField'
export type { RangeFieldProps } from './components/RangeField'
export type { InputFieldProps } from './components/InputField'
export type { CheckboxFieldProps } from './components/CheckboxField'
export type { RadioFieldProps, RadioFieldType, RadioOption, RadioOptions } from './components/RadioField'
export type { ButtonProps } from './components/Button'
export type { AlertProps } from './components/Alert'
export type { ModalProps } from './components/Modal'
