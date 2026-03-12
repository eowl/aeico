/**
 * Stylesheet loader for managing component styles
 * 
 * Provides singleton-based stylesheet caching and management
 * for efficient style reuse across components.
 */

import baseStyle from '../assets/css/common/base.css?inline'
import gridStyle from '../assets/css/common/grid.css?inline'
import formControlsStyle from '../assets/css/common/form-controls.css?inline'
import buttonStyle from '../assets/css/common/button.css?inline'
import dialogStyle from '../assets/css/common/dialog.css?inline'
import alertStyle from '../assets/css/common/alert.css?inline'

export type PresetStyleName = 'base' | 'grid' | 'form-controls' | 'button' | 'dialog' | 'alert'

class StyleSheetLoader {
  private static instance: StyleSheetLoader
  private sheetCache: Map<string, CSSStyleSheet> = new Map()
  private sharedSheetCache: Map<string, CSSStyleSheet> = new Map()
  private cssTextCache: Map<string, string> = new Map()
  private preloaded = false

  private constructor() {}

  static getInstance(): StyleSheetLoader {
    if (!StyleSheetLoader.instance) {
      StyleSheetLoader.instance = new StyleSheetLoader()
    }

    return StyleSheetLoader.instance
  }

  private static readonly presetStyleMap: Record<PresetStyleName, string> = {
    'base': baseStyle,
    'grid': gridStyle,
    'form-controls': formControlsStyle,
    'button': buttonStyle,
    'dialog': dialogStyle,
    'alert': alertStyle
  }

  /**
   * Preload common styles (optional)
   * Can be used by applications to register common stylesheets
   */
  preloadPresetStyles(styleNames: PresetStyleName[]): void {
    for (const name of styleNames) {
      const cssText = StyleSheetLoader.presetStyleMap[name]
      if (cssText) {
        this.preloadStyle(name, cssText)
      } else {
        console.warn(`[StyleSheetLoader] No CSS text found for style "${name}". Skipping preload.`)
      }
    }

    this.preloaded = true
  }

  /**
   * Preload a common stylesheet by name
   * 
   * @param name Stylesheet name
   * @param cssText CSS text content
   */
  preloadStyle(name: string, cssText: string): void {
    if (!this.sharedSheetCache.has(name)) {
      const sheet = new CSSStyleSheet()
      sheet.replaceSync(cssText)
      this.sharedSheetCache.set(name, sheet)
      this.cssTextCache.set(name, cssText)
    }
  }

  /**
   * Register a style, always overwriting any existing registration with the same name.
   * Returns true if an existing style with *different* CSS content was overridden.
   */
  overrideStyle(name: string, cssText: string): boolean {
    const existingText = this.cssTextCache.get(name)
    const isOverride = existingText !== undefined && existingText !== cssText

    const sheet = new CSSStyleSheet()
    sheet.replaceSync(cssText)
    this.sharedSheetCache.set(name, sheet)
    this.cssTextCache.set(name, cssText)

    return isOverride
  }

  /**
   * Register a preset common style, always overwriting any existing registration.
   * Returns true if an existing style with different CSS content was overridden.
   */
  overridePresetStyle(name: PresetStyleName): boolean {
    const cssText = StyleSheetLoader.presetStyleMap[name]
    if (!cssText) {
      console.warn(`[StyleSheetLoader] No preset CSS found for "${name}".`)

      return false
    }

    return this.overrideStyle(name, cssText)
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
   * Get a shared stylesheet by name
   * 
   * @param name Stylesheet name
   * @returns CSSStyleSheet instance or undefined if not found
   */
  getSharedSheet(name: string): CSSStyleSheet | undefined {
    return this.sharedSheetCache.get(name)
  }

  /**
   * Get a preset stylesheet by name, using sheetCache for deduplication.
   * Does NOT write to sharedSheetCache — the result is anonymous/private.
   * 
   * @param name Preset style name
   * @returns CSSStyleSheet instance or undefined if name is not a preset
   */
  getPresetSheet(name: PresetStyleName): CSSStyleSheet | undefined {
    const cssText = StyleSheetLoader.presetStyleMap[name]
    if (!cssText) return undefined

    return this.getSheet(cssText)
  }

  /**
   * Resolve a stylesheet by name: checks sharedSheetCache first,
   * then falls back to the preset map (via sheetCache) if the name is a PresetStyleName.
   * Returns undefined when the name is unknown in both registries.
   * 
   * @param name Style name
   * @returns CSSStyleSheet instance or undefined
   */
  resolveStyle(name: string): CSSStyleSheet | undefined {
    const shared = this.sharedSheetCache.get(name)
    if (shared) return shared

    return this.getPresetSheet(name as PresetStyleName)
  }

  /**
   * Returns all preset style names.
   */
  getAllPresetNames(): PresetStyleName[] {
    return Object.keys(StyleSheetLoader.presetStyleMap) as PresetStyleName[]
  }

  /**
   * Get multiple shared stylesheets by name
   * 
   * @param names Array of stylesheet names
   * @returns Array of CSSStyleSheet instances
   */
  getSharedSheets(names: string[]): CSSStyleSheet[] {
    const sheets: CSSStyleSheet[] = []
    
    for (const name of names) {
      const sheet = this.sharedSheetCache.get(name)
      if (sheet) {
        sheets.push(sheet)
      } else {
        console.warn(`[StyleSheetLoader] Shared style "${name}" not found. Available: ${Array.from(this.sharedSheetCache.keys()).join(', ')}`)
      }
    }
    
    return sheets
  }

  /**
   * Clear all cached stylesheets
   */
  clearCache(): void {
    this.sheetCache.clear()
    this.sharedSheetCache.clear()
    this.cssTextCache.clear()
    this.preloaded = false
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      totalSheets: this.sheetCache.size,
      commonSheets: this.sharedSheetCache.size,
      preloaded: this.preloaded,
      cachedStyles: Array.from(this.sharedSheetCache.keys()),
    }
  }
}

export default StyleSheetLoader.getInstance()
