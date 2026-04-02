import type { StyleOptions, StyleEntry } from '../core/types'
import styleStore from './style-store'

/**
 * Options passed to StyleAdapter.initialize() on first connectedCallback.
 */
export type StyleAdapterContext = {
  /** Component class name, used in warning messages */
  constructorName: string

  /** Static stylesheet entries declared on the component class (Layer 2) */
  styles?: StyleEntry[]

  /** Instance-level explicit style props set via create() (Layer 3) */
  options?: StyleOptions
}

export class StyleAdapter {
  private shadowRoot: ShadowRoot
  private hostStyle: CSSStyleDeclaration
  private sheets: CSSStyleSheet[] = []
  private adoptedSet: Set<CSSStyleSheet> = new Set()
  private initialized = false

  constructor(shadowRoot: ShadowRoot, hostStyle: CSSStyleDeclaration) {
    this.shadowRoot = shadowRoot
    this.hostStyle = hostStyle
  }

  initialize(context: StyleAdapterContext): void {
    if (this.initialized) return

    const enabled = context.options?.enable ?? true
    
    if (enabled) {
      if (context.styles?.length) {
        this._adoptStyles(context.styles, context.constructorName)
      }

      if (context.options) {
        this._applyOptions(context.options)
      }
    }

    this.initialized = true
  }

  private _adoptStyles(styles: StyleEntry[], constructorName?: string): void {
    for (const style of styles) {
      if (typeof style === 'string' || style instanceof CSSStyleSheet) {
        this._adopt(styleStore.getStyle(style))
      } else {
        console.warn(`${constructorName ? `[${constructorName}]` : ''} Invalid style entry:`, style)
      }
    }
  }

  private _adopt(sheet: CSSStyleSheet): void {
    if (!this.adoptedSet.has(sheet)) {
      this.adoptedSet.add(sheet)
      this.sheets.push(sheet)
      this.shadowRoot.adoptedStyleSheets = this.sheets
    }
  }

  private _applyOptions(options: StyleOptions): void {
    if (options.styles) {
      this._adoptStyles(options.styles)
    }

    if (options.cssVars) {
      this._setCssVars(options.cssVars)
    }
  }

  private _setCssVars(vars: Record<string, string>): void {
    for (const [key, value] of Object.entries(vars)) {
      this.hostStyle.setProperty(key, value)
    }
  }
}
