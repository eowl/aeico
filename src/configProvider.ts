import type { I18nService, ThemeType } from './types'
import styleStore, { type PresetStyleName } from './utils/styleStore'

export type preloadStyleEntry = PresetStyleName | Record<string, string>
export type preloadStyles = preloadStyleEntry[]

type BaseConfig = {
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
 * Component system configuration
 * Defines default behavior and services for all components
 */
export type ComponentConfig = BaseConfig & {
  /**
   * Common stylesheets to preload into the component system.
   * Preset names or `{ name: cssText }` objects (use `?inline` imports).
   */
  preloadStyles?: preloadStyles

  /**
   * Preload all 6 preset stylesheets (base, grid, form-controls, button, dialog, alert)
   * into the shared style registry in one step.
   * Merged with any explicit `preloadStyles` entries.
   * @default false
   */
  preloadAllPresetStyles?: boolean

  /**
   * Styles to automatically inject into every component's Shadow DOM.
   * Same format as `preloadStyles` — preset names or `{ name: cssText }` objects.
   * Entries that conflict with `preloadStyles` (same name, different CSS) take priority and override.
   */
  applyStyles?: preloadStyleEntry[]

  /**
   * Inject all 6 preset stylesheets into every component's Shadow DOM in one step.
   * Merged with any explicit `applyStyles` entries.
   * @default false
   */
  applyAllPresetStyles?: boolean

  /**
   * Whether components should load their own `static stylesheets` and `static useStyles`.
   * Set to `false` to prevent all components from applying their default styles globally.
   * Can be overridden per instance via the `enableStylesheets` property:
   * `true` forces on, `false` forces off, `undefined` (default) follows this global setting.
   * @default true
   */
  enableComponentStylesheets?: boolean
}

export type ResultConfig = BaseConfig & {
  preloadedStyleNames?: string[]
  applyStyleNames?: string[]
  enableComponentStylesheets?: boolean
}

const DEFAULT_CONFIG: ResultConfig = {
  theme: 'dark',
  enableI18n: true,
  disabled: false,
  i18nService: {
    t: (key: string) => key,
    subscribe: () => () => {}
  }
}

/**
 * Singleton configuration provider for the component system.
 * Use the exported functional API (`setComponentConfig` etc.) for normal usage,
 * or import the default export for direct instance access.
 */
class ConfigProvider {
  private static instance: ConfigProvider
  private config: ComponentConfig | null = null
  private preloadedStyleNames: Set<string> = new Set()
  private applyStyleNames: Set<string> = new Set()
  private enableComponentStylesheets: boolean | undefined = undefined

  /* Private constructor to enforce singleton pattern */
  private constructor() {}

  static getInstance(): ConfigProvider {
    if (!ConfigProvider.instance) {
      ConfigProvider.instance = new ConfigProvider()
    }

    return ConfigProvider.instance
  }

  /**
   * Set global component configuration.
   * Automatically registers any provided `preloadStyles` into the stylesheet loader.
   *
   * @example
   * ```ts
   * setComponentConfig({
   *   theme: 'dark',
   *   enableI18n: true,
   *   i18nService: { t: (key) => t(key), subscribe: (cb) => subscribe(cb) },
   *   preloadStyles: { button: buttonStyle, dialog: dialogStyle }
   * })
   * ```
   */
  set(config: ComponentConfig): void {
    this.config = { ...config }

    if (config.preloadAllPresetStyles) {
      styleStore.preloadPresetStyles(styleStore.getAllPresetNames())
      for (const name of styleStore.getAllPresetNames()) {
        this.preloadedStyleNames.add(name)
      }
    }

    if (config.preloadStyles) {
      this.handlePreloadStyles(config.preloadStyles)
    }

    if (config.applyAllPresetStyles) {
      for (const name of styleStore.getAllPresetNames()) {
        this.applyStyleNames.add(name)
      }
    }

    if (config.applyStyles) {
      this.handleDefaultStyles(config.applyStyles)
    }

    this.enableComponentStylesheets = config.enableComponentStylesheets

    if (this.config.enableI18n && !this.config.i18nService) {
      console.warn(
        'ComponentConfig: enableI18n is true but i18nService is not provided. ' +
        'i18n features will not work correctly.'
      )
    }
  }

  /** Registers styles from the preloadStyles configuration */
  private handlePreloadStyles(styles: preloadStyles): void {
    const presetNames: PresetStyleName[] = []
    for (const entry of styles) {
      if (typeof entry === 'string') {
        presetNames.push(entry)
        this.preloadedStyleNames.add(entry)
      } else {
        for (const [name, cssText] of Object.entries(entry)) {
          styleStore.preloadStyle(name, cssText)
          this.preloadedStyleNames.add(name)
        }
      }
    }

    if (presetNames.length) {
      styleStore.preloadPresetStyles(presetNames)
    }
  }

  /** Registers styles from the defaultStyles configuration, with override detection */
  private handleDefaultStyles(styles: preloadStyleEntry[]): void {
    for (const entry of styles) {
      if (typeof entry === 'string') {
        const overridden = styleStore.overridePresetStyle(entry)
        if (overridden) {
          console.log(`[ConfigProvider] applyStyles: "${entry}" overrides a style previously registered in preloadStyles.`)
        }
        this.applyStyleNames.add(entry)
      } else {
        for (const [name, cssText] of Object.entries(entry)) {
          const overridden = styleStore.overrideStyle(name, cssText)
          this.applyStyleNames.add(name)
          if (overridden) {
            console.log(`[ConfigProvider] applyStyles: "${name}" overrides a style previously registered in preloadStyles.`)
          }
        }
      }
    }
  }

  /** Returns the resolved configuration, merged with defaults */
  get(): ResultConfig {
    if (!this.config) {
      return DEFAULT_CONFIG
    }

    return {
      theme: this.config.theme ?? DEFAULT_CONFIG.theme,
      enableI18n: this.config.enableI18n ?? DEFAULT_CONFIG.enableI18n,
      disabled: this.config.disabled ?? DEFAULT_CONFIG.disabled,
      i18nService: this.config.i18nService ?? DEFAULT_CONFIG.i18nService,
      preloadedStyleNames: this.preloadedStyleNames.size ? Array.from(this.preloadedStyleNames) : undefined,
      applyStyleNames: this.applyStyleNames.size ? Array.from(this.applyStyleNames) : undefined,
      enableComponentStylesheets: this.enableComponentStylesheets
    }
  }

  /** Returns true if configuration has been explicitly set */
  has(): boolean {
    return this.config !== null
  }

  /** Returns a single resolved config value with fallback to default */
  getValue<K extends keyof ResultConfig>(key: K): ResultConfig[K] {
    return this.get()[key]
  }
}

const configProvider = ConfigProvider.getInstance()
export default configProvider

export function setComponentConfig(config: ComponentConfig): void {
  configProvider.set(config)
}

export function getComponentConfig(): ResultConfig {
  return configProvider.get()
}

export function hasComponentConfig(): boolean {
  return configProvider.has()
}

export function getConfigValue<K extends keyof ResultConfig>(key: K): ResultConfig[K] {
  const config = getComponentConfig()

  return config[key]
}
