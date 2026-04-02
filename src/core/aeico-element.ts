import { StyleAdapter } from '../utils/style-adapter'
import type {
  StyleOptions,
  StyleEntry,
  InferProps
} from './types'
import BaseElement from './base-element'

/**
 * AeicoElement — styled base class for Aeico's built-in components.
 *
 * Extends BaseElement with the full Aeico style system:
 * - StyleAdapter integration (adoptedStyleSheets)
 * - Component stylesheets (static styles / useStyles)
 * - CSS variable generation (styleGenerator)
 * - Global component config (setComponentConfig)
 *
 * For components that don't need Aeico styles, use AeicoBase instead.
 */
class AeicoElement extends BaseElement {
  private styleOptions?: StyleOptions

  protected static styles?: StyleEntry[]

  protected styleAdapter!: StyleAdapter

  constructor() {
    super()
    this.styleAdapter = new StyleAdapter(this.shadowRoot!, this.style)
  }

  connectedCallback() {
    super.connectedCallback()
    this._adaptStyles()
  }

  /**
   * Apply stylesheets to the shadow root.
   * Called on first connection and whenever style-related properties change.
   */
  private _adaptStyles() {
    const constructor = this.constructor as typeof AeicoElement

    this.styleAdapter.initialize({
      constructorName: constructor.name,
      styles: constructor.styles,
      options: this.styleOptions
    })

    this.styleOptions = undefined
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
      instance.styleOptions = config as StyleOptions
    }

    return instance
  }
}

export default AeicoElement
export type AeicoElementProps = InferProps<typeof AeicoElement>
