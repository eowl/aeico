/**
 * Convert camelCase to kebab-case (for element tag name resolution).
 * @example camelToKebab('aeButton') // => 'ae-button'
 */
export function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)
}
