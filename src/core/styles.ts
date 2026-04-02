enum StyleMode {
  Add = 'additive',
  R = 'replace'
}

export type StyleOptions = {
  enable?: boolean
  mode?: StyleMode
  styles?: StyleEntry[]
  cssVars?: Record<string, string>
}

export type StyleScope = 'document' | 'shadow'

export type StyleEntry = string | CSSStyleSheet | StyleResult

export const supportAdoptStyle: boolean =
  globalThis.ShadowRoot !== undefined &&
  'adoptedStyleSheets' in Document.prototype &&
  'replace' in CSSStyleSheet.prototype

export class StyleResult {
  readonly cssText: string
  private _sheetRef?: WeakRef<CSSStyleSheet>

  constructor(cssText: string, sheet?: CSSStyleSheet) {
    this.cssText = cssText
    if (sheet) {
      this._sheetRef = new WeakRef(sheet)
    }
  }

  get sheet(): CSSStyleSheet | undefined {
    if (!supportAdoptStyle) return undefined

    let sheet = this._sheetRef?.deref()
    if (!sheet) {
      sheet = new CSSStyleSheet()
      sheet.replaceSync(this.cssText)
      this._sheetRef = new WeakRef(sheet)
    }

    return sheet
  }

  toString(): string {
    return this.cssText
  }
}

class StyleStore {
  private static instance: StyleStore

  private _cache: Map<string, StyleResult> = new Map()
  private _sheetToResult: WeakMap<CSSStyleSheet, StyleResult> = new WeakMap()

  private constructor() {}

  static getInstance(): StyleStore {
    if (!StyleStore.instance) {
      StyleStore.instance = new StyleStore()
    }

    return StyleStore.instance
  }

  private _getStyleText(style: string): StyleResult {
    let result = this._cache.get(style)
    if (!result) {
      result = new StyleResult(style)
      this._cache.set(style, result)
    }

    return result
  }

  private _getStyleSheet(sheet: CSSStyleSheet): StyleResult {
    let result = this._sheetToResult.get(sheet)
    if (result) return result

    const cssText = Array.from(sheet.cssRules)
      .map(r => r.cssText)
      .join('\n')

    result = this._cache.get(cssText)
    if (!result) {
      result = new StyleResult(cssText, sheet)
      this._cache.set(cssText, result)
    }
    this._sheetToResult.set(sheet, result)

    return result
  }

  getStyle(style: StyleEntry): StyleResult {
    if (style instanceof StyleResult) {
      return style
    }

    if (typeof style === 'string') {
      return this._getStyleText(style)
    }

    if (style instanceof CSSStyleSheet) {
      return this._getStyleSheet(style)
    }

    throw new Error('Invalid style entry')
  }

  clear(): void {
    this._cache.clear()
    this._sheetToResult = new WeakMap()
  }
}

export const styleStore = StyleStore.getInstance()
export default styleStore

export function css(text: string): StyleResult {
  return styleStore.getStyle(text)
}

export type StyleAdapterContext = {
  constructorName: string
  styles?: StyleEntry[]
  options?: StyleOptions
}

export class StyleAdapter {
  private shadowRoot: ShadowRoot
  private hostStyle: CSSStyleDeclaration
  private sheets: CSSStyleSheet[] = []
  private adoptedSet: Set<StyleResult> = new Set()
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
        this._adoptStyles(context.styles)
      }

      if (context.options) {
        this._applyOptions(context.options)
      }
    }

    this.initialized = true
  }

  private _adoptStyles(styles: StyleEntry[]): void {
    for (const style of styles) {
      this._adopt(styleStore.getStyle(style))
    }
  }

  private _adopt(result: StyleResult): void {
    if (this.adoptedSet.has(result)) return
    this.adoptedSet.add(result)

    if (supportAdoptStyle) {
      this.sheets.push(result.sheet!)
      this.shadowRoot.adoptedStyleSheets = this.sheets
    } else {
      const el = document.createElement('style')
      el.textContent = result.cssText
      this.shadowRoot.appendChild(el)
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
