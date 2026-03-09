import type { I18nService, ThemeType } from './types'

/**
 * Component system configuration
 * Defines default behavior and services for all components
 */
export type ComponentConfig = {
  /**
   * Default theme for components
   * @default 'dark'
   */
  theme?: ThemeType

  /**
   * Whether to enable i18n by default for all components
   * @default true
   */
  enableI18n?: boolean

  /**
   * Whether components are disabled by default
   * @default false
   */
  disabled?: boolean

  /**
   * i18n service implementation
   * Required if enableI18n is true
   */
  i18nService?: I18nService
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<ComponentConfig> = {
  theme: 'dark',
  enableI18n: true,
  disabled: false,
  i18nService: {
    t: (key: string) => key,
    subscribe: () => () => {}
  }
}

/**
 * Global component configuration instance
 */
let globalConfig: ComponentConfig | null = null

/**
 * Set global component configuration
 * 
 * Should be called during application initialization to configure the component system.
 * This replaces the previous `setI18nService` function and provides unified configuration management.
 * 
 * @example
 * ```ts
 * import { setComponentConfig } from './components/configProvider'
 * import { t, subscribe } from './utils/languageStore'
 * 
 * setComponentConfig({
 *   theme: 'dark',
 *   enableI18n: true,
 *   i18nService: {
 *     t: (key) => t(key),
 *     subscribe: (callback) => subscribe(callback)
 *   }
 * })
 * ```
 */
export function setComponentConfig(config: ComponentConfig): void {
  globalConfig = { ...config }
  
  // Validate: if enableI18n is true, i18nService must be provided
  if (globalConfig.enableI18n && !globalConfig.i18nService) {
    console.warn(
      'ComponentConfig: enableI18n is true but i18nService is not provided. ' +
      'i18n features will not work correctly.'
    )
  }
}

/**
 * Get global component configuration
 * 
 * @returns Component configuration with defaults applied
 */
export function getComponentConfig(): Required<ComponentConfig> {
  if (!globalConfig) {
    return DEFAULT_CONFIG
  }
  
  // Merge with defaults
  return {
    theme: globalConfig.theme ?? DEFAULT_CONFIG.theme,
    enableI18n: globalConfig.enableI18n ?? DEFAULT_CONFIG.enableI18n,
    disabled: globalConfig.disabled ?? DEFAULT_CONFIG.disabled,
    i18nService: globalConfig.i18nService ?? DEFAULT_CONFIG.i18nService
  }
}

/**
 * Check if component configuration has been initialized
 */
export function hasComponentConfig(): boolean {
  return globalConfig !== null
}

/**
 * Get a specific config value with fallback to default
 * 
 * @param key Config key
 * @returns Config value
 */
export function getConfigValue<K extends keyof ComponentConfig>(
  key: K
): Required<ComponentConfig>[K] {
  const config = getComponentConfig()
  return config[key]
}
