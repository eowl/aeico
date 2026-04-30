import { StyleAdapter } from './styles';
import type { StyleEntry, StyleItems, StyleOptions } from './styles';
import type { InferProps } from './types';
import BaseElement from './base-element';

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
  private styleOptions?: StyleOptions;

  protected static styles?: StyleEntry;

  protected styleAdapter!: StyleAdapter;

  constructor() {
    super();
    this.styleAdapter = new StyleAdapter(this.shadowRoot!, this.style);
  }

  static get styleEntries(): StyleItems {
    return Array.isArray(this.styles) ? this.styles : this.styles ? [this.styles] : [];
  }

  connectedCallback() {
    super.connectedCallback();
    this._adaptStyles();
  }

  /**
   * Apply stylesheets to the shadow root.
   * StyleAdapter internally caches resolved sheets per styles array reference.
   */
  private _adaptStyles() {
    const ctor = this.constructor as typeof AeicoElement;

    this.styleAdapter.initialize({
      constructorName: ctor.name,
      styles: ctor.styleEntries,
      options: this.styleOptions,
    });

    this.styleOptions = undefined;
  }

  /**
   * Create a new instance of the component with configuration.
   *
   * @param config Configuration object (properties will be set directly)
   * @returns New component instance
   */
  static create<T extends AeicoElement>(this: new () => T, config?: Record<string, unknown>): T {
    const instance = new this();

    if (config) {
      Object.entries(config).forEach(([key, value]) => {
        if (key in instance) {
          (instance as Record<string, unknown>)[key] = value;
        }
      });
      // Style props are applied when the element connects to the DOM
      instance.styleOptions = config as StyleOptions;
    }

    return instance;
  }
}

export default AeicoElement;
export type AeicoElementProps = InferProps<typeof AeicoElement>;
