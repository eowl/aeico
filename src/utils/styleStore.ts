/**
 * StyleStore — global singleton for parsing and caching CSSStyleSheet objects.
 *
 * Responsibilities:
 * - Parse CSS text into CSSStyleSheet instances (deduplication by content)
 * - Maintain a named registry of shared stylesheets (presets + user-registered)
 * - Normalize externally-constructed CSSStyleSheet objects to canonical instances
 *   via content fingerprinting, preventing duplicate sheet objects with identical CSS
 */

import variablesStyle from '../assets/css/common/variables.css?inline'
import baseStyle from '../assets/css/common/base.css?inline'
import gridStyle from '../assets/css/common/grid.css?inline'
import formControlsStyle from '../assets/css/common/form-controls.css?inline'
import buttonStyle from '../assets/css/common/button.css?inline'
import dialogStyle from '../assets/css/common/dialog.css?inline'
import alertStyle from '../assets/css/common/alert.css?inline'
import type { StyleSpec } from '../types'

export type PresetStyleName = 'variables' | 'base' | 'grid' | 'form-controls' | 'button' | 'dialog' | 'alert'

class StyleStore {
  private static instance: StyleStore

  /** Anonymous sheet cache — keyed by raw CSS text */
  private sheetCache: Map<string, CSSStyleSheet> = new Map()

  /** Named shared sheet cache — keyed by registered name */
  private sharedSheetCache: Map<string, CSSStyleSheet> = new Map()

  /** Raw CSS text registry for sharedSheetCache entries (used by overrideStyle) */
  private cssTextCache: Map<string, string> = new Map()

  /**
   * WeakMap from an externally-supplied CSSStyleSheet to its canonical counterpart
   * in sheetCache. Avoids re-serializing cssRules on repeated normalizeSheet calls
   * for the same object.
   */
  private externalSheetMap: WeakMap<CSSStyleSheet, CSSStyleSheet> = new WeakMap()

  /** StyleSpec id → resolved CSSStyleSheet, for deduplication across instances */
  private specCache: Map<string, CSSStyleSheet> = new Map()

  private preloaded = false

  private constructor() {}

  static getInstance(): StyleStore {
    if (!StyleStore.instance) {
      StyleStore.instance = new StyleStore()
    }

    return StyleStore.instance
  }

  private static readonly presetStyleMap: Record<PresetStyleName, string> = {
    'base': baseStyle,
    'grid': gridStyle,
    'form-controls': formControlsStyle,
    'button': buttonStyle,
    'dialog': dialogStyle,
    'alert': alertStyle,
    'variables': variablesStyle
  }

  /**
   * Normalize an externally-constructed CSSStyleSheet to a canonical instance.
   *
   * If a CSSStyleSheet with identical CSS content already exists in the cache the
   * cached instance is returned, guaranteeing only a single object per unique style.
   * The first call for a given object serializes its cssRules once; subsequent calls
   * are resolved via the WeakMap in O(1).
   */
  normalizeSheet(sheet: CSSStyleSheet): CSSStyleSheet {
    const cached = this.externalSheetMap.get(sheet)
    if (cached) return cached

    // Serialize rules as content fingerprint
    const fingerprint = Array.from(sheet.cssRules).map(r => r.cssText).join('')

    if (this.sheetCache.has(fingerprint)) {
      const canonical = this.sheetCache.get(fingerprint)!
      this.externalSheetMap.set(sheet, canonical)
      return canonical
    }

    // First occurrence — treat the sheet itself as canonical
    this.sheetCache.set(fingerprint, sheet)
    this.externalSheetMap.set(sheet, sheet)
    return sheet
  }

  /**
   * Preload all or a subset of preset styles into the named shared registry.
   */
  preloadPresetStyles(styleNames: PresetStyleName[]): void {
    for (const name of styleNames) {
      const cssText = StyleStore.presetStyleMap[name]
      if (cssText) {
        this.preloadStyle(name, cssText)
      } else {
        console.warn(`[StyleStore] No CSS text found for style "${name}". Skipping preload.`)
      }
    }

    this.preloaded = true
  }

  /**
   * Register a named stylesheet. No-op if the name is already registered.
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
   * Register a named stylesheet, always overwriting any existing entry.
   * Returns true if a previously registered entry with *different* CSS was replaced.
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
   * Overwrite a preset entry in the named registry with its built-in CSS text.
   * Returns true if an entry with different CSS was replaced.
   */
  overridePresetStyle(name: PresetStyleName): boolean {
    const cssText = StyleStore.presetStyleMap[name]
    if (!cssText) {
      console.warn(`[StyleStore] No preset CSS found for "${name}".`)
      return false
    }

    return this.overrideStyle(name, cssText)
  }

  /**
   * Return a CSSStyleSheet for the given CSS text, creating and caching it on first use.
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
   * Return the named shared stylesheet, or undefined if not registered.
   */
  getSharedSheet(name: string): CSSStyleSheet | undefined {
    return this.sharedSheetCache.get(name)
  }

  /**
   * Return the preset stylesheet for the given name via the anonymous sheetCache.
   * Does not write to sharedSheetCache — the result is anonymous/private.
   */
  getPresetSheet(name: PresetStyleName): CSSStyleSheet | undefined {
    const cssText = StyleStore.presetStyleMap[name]
    if (!cssText) return undefined

    return this.getSheet(cssText)
  }

  /**
   * Resolve a stylesheet by name: checks sharedSheetCache first, then falls back
   * to the preset map. Returns undefined when the name is unknown in both registries.
   */
  resolveStyle(name: string): CSSStyleSheet | undefined {
    const shared = this.sharedSheetCache.get(name)
    if (shared) return shared

    return this.getPresetSheet(name as PresetStyleName)
  }

  /**
   * Return all preset style names.
   */
  getAllPresetNames(): PresetStyleName[] {
    return Object.keys(StyleStore.presetStyleMap) as PresetStyleName[]
  }

  /**
   * Return the named shared stylesheets for each supplied name.
   * Logs a warning for any name not found in the registry.
   */
  getSharedSheets(names: string[]): CSSStyleSheet[] {
    const sheets: CSSStyleSheet[] = []

    for (const name of names) {
      const sheet = this.sharedSheetCache.get(name)
      if (sheet) {
        sheets.push(sheet)
      } else {
        console.warn(`[StyleStore] Shared style "${name}" not found. Available: ${Array.from(this.sharedSheetCache.keys()).join(', ')}`)
      }
    }

    return sheets
  }

  /**
   * Recursively resolve a StyleSpec and its deps into two lists:
   * - documentSheets: CSSStyleSheets to push into document.adoptedStyleSheets
   * - shadowSheets:   CSSStyleSheets to adopt into the component's shadow root
   *
   * Deduplicates by spec.id — each spec is parsed only once regardless of how
   * many components share the same dependency.
   */
  resolveSpec(spec: StyleSpec): { documentSheets: CSSStyleSheet[]; shadowSheets: CSSStyleSheet[] } {
    const documentSheets: CSSStyleSheet[] = []
    const shadowSheets: CSSStyleSheet[] = []
    const visited = new Set<string>()

    const walk = (s: StyleSpec) => {
      if (visited.has(s.id)) return
      visited.add(s.id)

      // Resolve deps first (depth-first)
      for (const dep of s.deps ?? []) {
        walk(dep)
      }

      // Resolve this spec's sheet
      let sheet = this.specCache.get(s.id)
      if (!sheet) {
        sheet = this.getSheet(s.code)
        this.specCache.set(s.id, sheet)
      }

      if (s.scope === 'document') {
        documentSheets.push(sheet)
      } else {
        shadowSheets.push(sheet)
      }
    }

    walk(spec)
    return { documentSheets, shadowSheets }
  }

  /**
   * Clear all cached stylesheets.
   */
  clearCache(): void {
    this.sheetCache.clear()
    this.sharedSheetCache.clear()
    this.cssTextCache.clear()
    this.specCache.clear()
    this.preloaded = false
  }

  /**
   * Return cache statistics for debugging.
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

export default StyleStore.getInstance()
