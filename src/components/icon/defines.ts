export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | number

export type IconColor = 'default' | 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info'

export interface IconDefinition {
  path: string
  viewBox?: string
}

export const defaultViewBox = '0 0 24 24'

export type IconRegistryData = Record<string, string | IconDefinition>
