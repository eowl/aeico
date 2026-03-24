import { StyleAdapter } from '../utils/style-adapter'
import type {
  StyleProps,
  StyleEntry,
  Props,
  StyleVariableGenerator,
  InferProps
} from './types'
import { getComponentConfig } from './config-provider'
import BaseElement from './base-element'

/**
 * AeicoElement — styled base class for Aeico's built-in components.
 *
 * Extends BaseElement with the full Aeico style system:
 * - StyleAdapter integration (adoptedStyleSheets)
 * - Component stylesheets (static stylesheets / useStyles)
 * - CSS variable generation (styleGenerator)
 * - Global component config (setComponentConfig)
 *
 * For components that don't need Aeico styles, use AeicoBase instead.
 */
class AeicoElement extends BaseElement {
  private pendingStyleProps?: StyleProps

  // Static global config (shared across all instances)
  private static globalConfig: ReturnType<typeof getComponentConfig>

  // Instance-level config overrides
  private instanceConfig?: Partial<{
    enableI18n: boolean
    theme: string
  }>

  static props: Props = {
    enableStylesheets: { type: Boolean },
    styleSheetText: { type: String },
    styleSheet: { type: Object },
    loadStyleSheets: { type: Array },
    cssVars: { type: Object },
    disabled: { type: Boolean },
  }

  /**
   * CSS stylesheets for this component (loaded via `?inline` imports).
   * Applied in order after `useStyles`.
   *
   * @example
   * ```typescript
   * class MyComponent extends AeicoElement {
   *   protected static stylesheets = [myComponentStyles]
   * }
   * ```
   */
  protected static stylesheets?: StyleEntry[]

  /**
   * Named styles to load from the shared style registry before applying this
   * component's own stylesheets.
   *
   * @example
   * ```typescript
   * class RangeField extends AeicoField {
   *   protected static useStyles = ['form-controls']
   * }
   * ```
   */
  protected static useStyles?: string[]

  /**
   * Style variable generator for this component.
   * Subclasses can override to provide custom CSS variable generation.
   * For theme-based generation, use the Themeable mixin.
   */
  protected static styleGenerator?: StyleVariableGenerator

  declare enableStylesheets?: boolean
  declare styleSheetText?: string
  declare styleSheet?: CSSStyleSheet
  declare loadStyleSheets?: string[]
  declare cssVars?: Record<string, any>
  declare disabled?: boolean

  /** Get effective configuration (global + instance overrides) */
  protected get effectiveConfig() {
    return {
      ...AeicoElement.globalConfig,
      ...this.instanceConfig
    }
  }

  protected styleAdapter!: StyleAdapter

  constructor() {
    super()
    this.styleAdapter = new StyleAdapter(this.shadowRoot!, this.style)
  }

  /** Generate CSS custom property values for this component instance. */
  public generateStyleVars(): Record<string, string> {
    const constructor = this.constructor as typeof AeicoElement
    if (!constructor.styleGenerator) return {}
    return constructor.styleGenerator.generate({})
  }

  connectedCallback() {
    super.connectedCallback()
    // Cache global config on first connection — connectedCallback fires after
    // all top-level synchronous module code, so setComponentConfig is guaranteed.
    if (!AeicoElement.globalConfig) {
      AeicoElement.globalConfig = getComponentConfig()
    }
    this.adaptStylesheet()
  }

  /**
   * Apply stylesheets to the shadow root.
   * Called on first connection and whenever style-related properties change.
   */
  adaptStylesheet() {
    const constructor = this.constructor as typeof AeicoElement
    const config = AeicoElement.globalConfig

    this.styleAdapter.initialize({
      enableStylesheets: this.enableStylesheets,
      globalEnableComponentStylesheets: config?.enableComponentStylesheets,
      constructorName: constructor.name,
      useStyles: constructor.useStyles,
      stylesheets: constructor.stylesheets,
      pendingStyleProps: this.pendingStyleProps,
      generateStyleVars: () => this.generateStyleVars(),
    })

    this.pendingStyleProps = undefined
  }

  /**
   * Create a new instance of the component with configuration.
   *
   * @param config Configuration object (properties will be set directly)
   * @returns New component instance
   */
  static create<T extends AeicoElement>(
    this: new () => T,
    config?: Record<string, any>
  ): T {
    const instance = new this()

    if (config) {
      Object.entries(config).forEach(([key, value]) => {
        if (key in instance) {
          (instance as any)[key] = value
        }
      })
      // Style props are applied when the element connects to the DOM
      instance.pendingStyleProps = config as StyleProps
    }

    return instance
  }
}

export default AeicoElement
export type AeicoElementProps = InferProps<typeof AeicoElement>
