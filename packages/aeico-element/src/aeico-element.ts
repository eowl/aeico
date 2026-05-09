import { StyleAdapter } from './styles';
import type { StyleEntry, StyleItems, StyleOptions } from './styles';
import type { InferProps } from './types';
import BaseElement from './base-element';
import { render } from 'aeico-view';
import type { RenderResult } from 'aeico-view';
import { isRenderResult } from './utils';

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
    this.styleAdapter = new StyleAdapter(this.shadowRoot!);
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
  static create<T extends AeicoElement>(
    this: new () => T,
    configOrChildren?: Record<string, unknown> | RenderResult,
    children?: RenderResult,
  ): T {
    const instance = new this();

    const config = isRenderResult(configOrChildren) ? undefined : configOrChildren;
    const childResult = isRenderResult(configOrChildren) ? configOrChildren : children;

    if (config) {
      Object.entries(config).forEach(([key, value]) => {
        if (key === 'style') return; // handled separately below
        if (key in instance) {
          (instance as Record<string, unknown>)[key] = value;
        }
      });

      if (config.style !== undefined) {
        const s = config.style;
        if (typeof s === 'string') {
          instance.style.cssText = s;
        } else if (s && typeof s === 'object') {
          for (const [k, v] of Object.entries(s as Record<string, string>)) {
            if (k.startsWith('--')) {
              instance.style.setProperty(k, String(v));
            } else {
              (instance.style as unknown as Record<string, string>)[k] = String(v);
            }
          }
        }
      }

      // Style props are applied when the element connects to the DOM
      instance.styleOptions = config as StyleOptions;
    }

    if (childResult) {
      render(childResult, instance);
    }

    return instance;
  }
}

export default AeicoElement;
export type AeicoElementProps = InferProps<typeof AeicoElement>;
