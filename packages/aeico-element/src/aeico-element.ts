import { StyleAdapter } from './styles';
import type { StyleEntry, StyleItems, StyleOptions } from './styles';
import type { InferProps } from './types';
import BaseElement from './base-element';
import { render } from 'aeico-view';
import type { RenderResult } from 'aeico-view';
import { isRenderResult } from './utils';

/**
 * Full-featured base class for Aeico Web Components.
 *
 * Extends `AeicoBase` with the Aeico style system (adoptedStyleSheets / shadow DOM styles).
 * Use this for any component that needs scoped CSS. For style-free utility components,
 * extend {@link AeicoBase} instead.
 *
 * **Lifecycle order (per update):**
 * `onPrepare` → watchers → `render()` → `onUpdated` → `onMounted` (first render only)
 *
 * @example
 * ```typescript
 * import { AeicoElement, prop, watch, computed } from 'aeico-element'
 * import { html } from 'aeico-view'
 *
 * class MyCounter extends AeicoElement {
 *   // Reactive prop — reflects to HTML attribute automatically
 *   @prop({ type: Number }) accessor count = 0
 *
 *   // Cached computed property — recalculated only when `count` changes
 *   @computed('count')
 *   get doubled() { return this.count * 2 }
 *
 *   // Watcher — called with (newValue, oldValue) after each change
 *   @watch('count')
 *   onCountChange(next: number, prev: number) {
 *     console.log(`${prev} → ${next}`)
 *   }
 *
 *   override render() {
 *     return html(({ div, button, span }) => {
 *       div({}, () => {
 *         button({ onclick: () => this.count--, textContent: '-' })
 *         span({ textContent: String(this.count) })
 *         button({ onclick: () => this.count++, textContent: '+' })
 *       })
 *     })
 *   }
 *
 *   static override styles = `
 *     button { padding: 4px 8px; cursor: pointer; }
 *     span   { min-width: 2ch; text-align: center; }
 *   `
 * }
 *
 * MyCounter.define('my-counter')
 * // <my-counter count="0"></my-counter>
 * ```
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
