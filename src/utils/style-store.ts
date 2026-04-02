import type { StyleEntry } from '../core/types'

class StyleStore {
  private static instance: StyleStore

  private _cache: Map<string, CSSStyleSheet> = new Map()
  private _fingerprintCache: Map<string, CSSStyleSheet> = new Map()
  private _sheetCache: WeakMap<CSSStyleSheet, CSSStyleSheet> = new WeakMap()

  private constructor() {}

  static getInstance(): StyleStore {
    if (!StyleStore.instance) {
      StyleStore.instance = new StyleStore()
    }

    return StyleStore.instance
  }

  private _stylesSheet(sheet: CSSStyleSheet): CSSStyleSheet {
    if (this._sheetCache.has(sheet)) {
      return this._sheetCache.get(sheet)!
    }

    const fingerprint = Array.from(sheet.cssRules).map(r => r.cssText).join('')

    if (this._fingerprintCache.has(fingerprint)) {
      const canonical = this._fingerprintCache.get(fingerprint)!
      this._sheetCache.set(sheet, canonical)

      return canonical
    }
    this._fingerprintCache.set(fingerprint, sheet)
    this._sheetCache.set(sheet, sheet)

    return sheet
  }

  getStyle(style: StyleEntry): CSSStyleSheet {
    if (typeof style === 'string') {
      if (!this._cache.has(style)) {
        const sheet = new CSSStyleSheet()
        sheet.replaceSync(style)
        this._cache.set(style, sheet)
      }

      return this._cache.get(style)!
    } else if (style instanceof CSSStyleSheet) {
      return this._stylesSheet(style)
    } else {
      throw new Error('Invalid style entry')
    }
  }

  clear(): void {
    this._cache.clear()
    this._fingerprintCache.clear()
    this._sheetCache = new WeakMap()
  }
}

const styleStore = StyleStore.getInstance()

export function css(text: string): CSSStyleSheet {
  return styleStore.getStyle(text)
}

export default styleStore
