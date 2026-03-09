/**
 * Stylesheet loader for managing component styles
 * 
 * Provides singleton-based stylesheet caching and management
 * for efficient style reuse across components.
 */

class StyleSheetLoader {
  private static instance: StyleSheetLoader
  private sheetCache: Map<string, CSSStyleSheet> = new Map()
  private commonSheetCache: Map<string, CSSStyleSheet> = new Map()
  private preloaded = false

  private constructor() {}

  static getInstance(): StyleSheetLoader {
    if (!StyleSheetLoader.instance) {
      StyleSheetLoader.instance = new StyleSheetLoader()
    }
    return StyleSheetLoader.instance
  }

  /**
   * Preload common styles (optional)
   * Can be used by applications to register common stylesheets
   */
  preloadCommonStyles(): void {
    this.preloaded = true
  }

  /**
   * Register a common stylesheet by name
   * 
   * @param name Stylesheet name
   * @param cssText CSS text content
   */
  registerCommonStyle(name: string, cssText: string): void {
    if (!this.commonSheetCache.has(name)) {
      const sheet = new CSSStyleSheet()
      sheet.replaceSync(cssText)
      this.commonSheetCache.set(name, sheet)
    }
  }

  /**
   * Get or create a stylesheet from CSS text
   * 
   * @param cssText CSS text content
   * @returns CSSStyleSheet instance
   */
  getSheet(cssText: string): CSSStyleSheet {
    if (this.sheetCache.has(cssText)) {
      return this.sheetCache.get(cssText)!
    }

    const sheet = new CSSStyleSheet()
    sheet.replaceSync(cssText)
    this.sheetCache.set(cssText, sheet)
    
    return sheet
  }

  /**
   * Get a common stylesheet by name
   * 
   * @param name Stylesheet name
   * @returns CSSStyleSheet instance or undefined if not found
   */
  getCommonSheet(name: string): CSSStyleSheet | undefined {
    return this.commonSheetCache.get(name)
  }

  /**
   * Get multiple common stylesheets by name
   * 
   * @param names Array of stylesheet names
   * @returns Array of CSSStyleSheet instances
   */
  getCommonSheets(names: string[]): CSSStyleSheet[] {
    const sheets: CSSStyleSheet[] = []
    
    for (const name of names) {
      const sheet = this.commonSheetCache.get(name)
      if (sheet) {
        sheets.push(sheet)
      } else {
        console.warn(`[StyleSheetLoader] Common style "${name}" not found. Available: ${Array.from(this.commonSheetCache.keys()).join(', ')}`)
      }
    }
    
    return sheets
  }

  /**
   * Clear all cached stylesheets
   */
  clearCache(): void {
    this.sheetCache.clear()
    this.commonSheetCache.clear()
    this.preloaded = false
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      totalSheets: this.sheetCache.size,
      commonSheets: this.commonSheetCache.size,
      preloaded: this.preloaded,
      cachedStyles: Array.from(this.commonSheetCache.keys()),
    }
  }
}

export default StyleSheetLoader.getInstance()
