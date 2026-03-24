import { getComponentConfig, setComponentConfig, hasComponentConfig } from './config-provider'
import type { I18nService } from './types'

/**
 * Set global i18n service
 * 
 * @deprecated Use `setComponentConfig({ i18nService })` instead
 * @see setComponentConfig
 * 
 * @example
 * ```ts
 * // Old way (deprecated):
 * setI18nService({ t, subscribe })
 * 
 * // New way (recommended):
 * import { setComponentConfig } from '@components/configProvider'
 * setComponentConfig({ i18nService: { t, subscribe } })
 * ```
 */
export function setI18nService(service: I18nService): void {
  console.warn(
    'setI18nService is deprecated. Use setComponentConfig({ i18nService }) instead.'
  )
  setComponentConfig({ i18nService: service })
}

/**
 * Get global i18n service
 * 
 * @throws {Error} If the service is not initialized
 */
export function getI18nService(): I18nService {
  const config = getComponentConfig()
  if (!config.i18nService) {
    throw new Error(
      'I18n service not initialized. Please call setComponentConfig({ i18nService }) before using components that require i18n.'
    )
  }
  return config.i18nService
}

/**
 * Check if i18n service is initialized
 */
export function hasI18nService(): boolean {
  if (!hasComponentConfig()) {
    return false
  }
  const config = getComponentConfig()
  return config.i18nService !== undefined
}
