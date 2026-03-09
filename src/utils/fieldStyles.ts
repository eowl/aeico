/**
 * Field styles helper utilities
 * 
 * Provides CSS variable configurations for field components,
 * supporting different sizes and themes.
 */

import type { StyleVariableGenerator } from '../types'

export type FieldSize = 'sm' | 'md' | 'lg'
export type FieldTheme = 'dark' | 'light'

export interface FieldStyleOptions {
  size?: FieldSize
  theme?: FieldTheme
}

/**
 * Size presets for field components
 */
const SIZE_PRESETS: Record<FieldSize, {
  fontSize: string
  padding: string
  btnSize: string
  btnFontSize: string
  checkboxSize: string
  toggleWidth: string
  toggleHeight: string
  toggleSliderSize: string
}> = {
  sm: {
    fontSize: '11px',
    padding: '2px 5px',
    btnSize: '14px',
    btnFontSize: '10px',
    checkboxSize: '12px',
    toggleWidth: '24px',
    toggleHeight: '12px',
    toggleSliderSize: '8px'
  },
  md: {
    fontSize: '12px',
    padding: '4px 7px',
    btnSize: '16px',
    btnFontSize: '11px',
    checkboxSize: '14px',
    toggleWidth: '32px',
    toggleHeight: '16px',
    toggleSliderSize: '12px'
  },
  lg: {
    fontSize: '14px',
    padding: '6px 9px',
    btnSize: '18px',
    btnFontSize: '12px',
    checkboxSize: '16px',
    toggleWidth: '40px',
    toggleHeight: '20px',
    toggleSliderSize: '16px'
  }
}

/**
 * Theme color presets
 */
const THEME_PRESETS: Record<FieldTheme, {
  bg: string
  bgHover: string
  bgFocus: string
  color: string
  borderColor: string
  borderColorHover: string
  borderColorFocus: string
  btnBg: string
  btnBgHover: string
  btnColor: string
  btnColorHover: string
}> = {
  dark: {
    bg: '#1e1e1e',
    bgHover: '#252525',
    bgFocus: '#252525',
    color: '#cccccc',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderColorHover: 'rgba(255, 255, 255, 0.12)',
    borderColorFocus: '#0e639c',
    btnBg: '#3a3a3a',
    btnBgHover: '#1a3a4a',
    btnColor: '#909090',
    btnColorHover: '#4fc3f7'
  },
  light: {
    bg: '#ffffff',
    bgHover: '#f5f5f5',
    bgFocus: '#f5f5f5',
    color: '#333333',
    borderColor: 'rgba(0, 0, 0, 0.15)',
    borderColorHover: 'rgba(0, 0, 0, 0.25)',
    borderColorFocus: '#0e639c',
    btnBg: '#e0e0e0',
    btnBgHover: '#0e639c',
    btnColor: '#666666',
    btnColorHover: '#ffffff'
  }
}

/**
 * Generate CSS variables configuration for field components
 * 
 * @param options Style options including size and theme
 * @returns CSS variables object ready to be passed to component config
 * 
 * @example
 * ```typescript
 * const config = {
 *   cssVars: createFieldCssVars({ size: 'md', theme: 'dark' })
 * }
 * ```
 */
export function createFieldCssVars(options?: FieldStyleOptions): Record<string, string> {
  const { size = 'md', theme = 'dark' } = options || {}
  
  const sizePreset = SIZE_PRESETS[size]
  const themePreset = THEME_PRESETS[theme]
  
  return {
    // Select element styles
    '--select-font-size': sizePreset.fontSize,
    '--select-padding': sizePreset.padding,
    '--select-bg': themePreset.bg,
    '--select-bg-hover': themePreset.bgHover,
    '--select-bg-focus': themePreset.bgFocus,
    '--select-color': themePreset.color,
    '--select-border-color': themePreset.borderColor,
    '--select-border-color-hover': themePreset.borderColorHover,
    '--select-border-color-focus': themePreset.borderColorFocus,
    
    // Input element styles (same as select)
    '--input-font-size': sizePreset.fontSize,
    '--input-padding': sizePreset.padding,
    '--input-bg': themePreset.bg,
    '--input-bg-hover': themePreset.bgHover,
    '--input-bg-focus': themePreset.bgFocus,
    '--input-color': themePreset.color,
    '--input-border-color': themePreset.borderColor,
    '--input-border-color-hover': themePreset.borderColorHover,
    '--input-border-color-focus': themePreset.borderColorFocus,
    
    // Reset button styles
    '--reset-btn-size': sizePreset.btnSize,
    '--reset-btn-font-size': sizePreset.btnFontSize,
    '--reset-btn-bg': themePreset.btnBg,
    '--reset-btn-bg-hover': themePreset.btnBgHover,
    '--reset-btn-color': themePreset.btnColor,
    '--reset-btn-color-hover': themePreset.btnColorHover,
    
    // Clear button styles (same size as reset button)
    '--clear-btn-size': sizePreset.btnSize,
    '--clear-btn-font-size': sizePreset.btnFontSize,
    '--clear-btn-bg': themePreset.btnBg,
    '--clear-btn-color': themePreset.btnColor,
    
    // Checkbox styles
    '--checkbox-size': sizePreset.checkboxSize,
    
    // Toggle styles
    '--toggle-width': sizePreset.toggleWidth,
    '--toggle-height': sizePreset.toggleHeight,
    '--toggle-slider-size': sizePreset.toggleSliderSize
  }
}

/**
 * Create custom CSS variables by merging with base configuration
 * 
 * @param baseOptions Base field style options
 * @param customVars Custom CSS variables to override
 * @returns Merged CSS variables object
 * 
 * @example
 * ```typescript
 * const config = {
 *   cssVars: mergeFieldCssVars(
 *     { size: 'lg' },
 *     { '--select-bg': '#2a2a2a' }
 *   )
 * }
 * ```
 */
export function mergeFieldCssVars(
  baseOptions?: FieldStyleOptions,
  customVars?: Record<string, string>
): Record<string, string> {
  const baseVars = createFieldCssVars(baseOptions)
  return { ...baseVars, ...customVars }
}

/**
 * Style variable generator for field components
 * Automatically integrated with AeicoField to generate styles based on size and theme props
 * 
 * @example
 * ```typescript
 * // Used internally by AeicoField
 * class MyField extends AeicoField {
 *   // Automatically inherits fieldStyleGenerator
 *   // Just set size and theme props:
 *   static create({ size: 'lg', theme: 'dark' })
 * }
 * ```
 */
export const fieldStyleGenerator: StyleVariableGenerator = {
  generate(config) {
    const { size = 'md', theme = 'dark' } = config

    return createFieldCssVars({
      size: size as FieldSize,
      theme: theme as FieldTheme
    })
  }
}
