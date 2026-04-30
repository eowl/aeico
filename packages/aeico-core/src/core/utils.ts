/**
 * Convert camelCase or PascalCase to kebab-case.
 * Strips leading underscores/numbers to ensure valid custom element names.
 * @example toKebab('MyComponent') // => 'my-component'
 */
export function toKebab(str: string): string {
  const cleaned = str.replace(/^[_\d]+/, '')

  return cleaned.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}
