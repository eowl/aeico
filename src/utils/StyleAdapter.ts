import styleStore from './styleStore'
import type { StyleProps, StyleEntry, StyleSpec } from '../types'

/**
 * Options passed to StyleAdapter.initialize() on first connectedCallback.
 */
export type StyleAdapterInitOptions = {
  /**
   * Instance-level override for component stylesheet loading (three-state):
   * true  → force on  (overrides global)
   * false → force off (overrides global)
   * undefined → follow globalEnableComponentStylesheets
   */
  enableStylesheets?: boolean

  /** Global enableComponentStylesheets flag (default: true) */
  globalEnableComponentStylesheets?: boolean

  /** Component class name, used in warning messages */
  constructorName: string

  /** Static useStyles list declared on the component class (Layer 2) */
  useStyles?: string[]

  /** Static stylesheet entries declared on the component class (Layer 2) */
  stylesheets?: StyleEntry[]

  /** Instance-level explicit style props set via create() (Layer 3) */
  pendingStyleProps?: StyleProps

  /**
   * Callback to generate CSS custom property values for this component instance.
   * Delegated back to the element so that subclass overrides of generateStyleVars()
   * are honoured without coupling StyleAdapter to the element class hierarchy.
   */
  generateStyleVars: () => Record<string, string>
}

/**
 * StyleAdapter — per-instance style applicator for shadow DOM components.
 *
 * Responsibilities:
 * - Track which CSSStyleSheet objects have been adopted into a shadow root
 * - Apply the three-layer style initialization pipeline on first connection
 * - Write CSS custom properties to the host element's inline style
 *
 * StyleAdapter is intentionally decoupled from AeicoElement's reactive property
 * system; it only cares about CSSStyleSheet objects and CSS variables.
 */
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

  /**
   * Run the three-layer style initialization pipeline.
   * Idempotent — subsequent calls after the first connection are no-ops.
   */
  initialize(options: StyleAdapterInitOptions): void {
    if (this.initialized) return

    // Layer 2: Component default styles
    // three-state: true → force on, false → force off, undefined → follow global
    const loadComponentStyles = options.enableStylesheets === true
      ? true
      : options.enableStylesheets === false
        ? false
        : options.globalEnableComponentStylesheets !== false

    if (loadComponentStyles) {
      // 2a: Named styles from the shared registry
      if (options.useStyles?.length) {
        for (const name of options.useStyles) {
          const sheet = styleStore.resolveStyle(name)
          if (sheet) {
            this.adopt(sheet)
          } else {
            console.warn(`[${options.constructorName}] useStyles: "${name}" not found in registry and is not a preset style. Skipping.`)
          }
        }
      }

      // 2b: StyleEntry array — supports StyleSpec (with scope/deps), raw string, CSSStyleSheet
      if (options.stylesheets?.length) {
        for (const entry of options.stylesheets) {
          if (typeof entry === 'string') {
            // Raw CSS string — shadow scope by default
            this.adoptStyleText(entry)
          } else if (entry instanceof CSSStyleSheet) {
            // Pre-built CSSStyleSheet — shadow scope by default
            this.adopt(styleStore.normalizeSheet(entry))
          } else {
            // StyleSpec — resolve deps recursively, route by scope
            const { documentSheets, shadowSheets } = styleStore.resolveSpec(entry as StyleSpec)
            StyleAdapter.applyToDocument(documentSheets)
            for (const sheet of shadowSheets) {
              this.adopt(sheet)
            }
          }
        }
      }
    }

    // Layer 3: Instance explicit style props — always applied, highest priority
    if (options.pendingStyleProps) {
      this.applyProps(options.pendingStyleProps, options.generateStyleVars)
    }

    this.initialized = true
  }

  /**
   * Push CSSStyleSheet objects to document.adoptedStyleSheets (deduplicates).
   * Called for 'document'-scoped StyleSpec entries so that CSS custom properties
   * cascade into all shadow roots via CSS inheritance.
   */
  static applyToDocument(sheets: CSSStyleSheet[]): void {
    if (typeof document === 'undefined') return
    const current = document.adoptedStyleSheets
    const toAdd = sheets.filter(s => !current.includes(s))
    if (toAdd.length) {
      document.adoptedStyleSheets = [...current, ...toAdd]
    }
  }

  /**
   * Adopt a stylesheet from raw CSS text.
   * Delegates to styleStore for deduplication across component instances.
   */
  adoptStyleText(cssText: string): void {
    this.adopt(styleStore.getSheet(cssText))
  }

  /**
   * Adopt stylesheets by name from the shared registry.
   */
  adoptShared(names: string[]): void {
    for (const sheet of styleStore.getSharedSheets(names)) {
      this.adopt(sheet)
    }
  }

  /**
   * Apply a StyleProps object: named sheets, text sheet, explicit CSSStyleSheet,
   * generated CSS vars, and manual CSS vars.
   *
   * @param props - Style configuration from the component instance
   * @param generateStyleVars - Callback producing CSS custom property values
   */
  applyProps(
    props: StyleProps,
    generateStyleVars?: () => Record<string, string>
  ): void {
    if (props.styleSheetNames?.length) {
      this.adoptShared(props.styleSheetNames)
    }

    if (props.styleSheetText) {
      this.adoptStyleText(props.styleSheetText)
    }

    if (props.styleSheet instanceof CSSStyleSheet) {
      this.adopt(styleStore.normalizeSheet(props.styleSheet))
    }

    if (generateStyleVars) {
      const generated = generateStyleVars()
      if (Object.keys(generated).length > 0) {
        this.setCssVars(generated)
      }
    }

    if (props.cssVars) {
      this.setCssVars(props.cssVars)
    }
  }

  /**
   * Write CSS custom properties to the host element's inline style.
   */
  setCssVars(vars: Record<string, string>): void {
    for (const [key, value] of Object.entries(vars)) {
      this.hostStyle.setProperty(key, value)
    }
  }

  /**
   * Adopt a single CSSStyleSheet into the shadow root.
   * Deduplicates by object reference — the Set guarantees each sheet is added once.
   */
  private adopt(sheet: CSSStyleSheet): void {
    if (!this.adoptedSet.has(sheet)) {
      this.adoptedSet.add(sheet)
      this.sheets.push(sheet)
      this.shadowRoot.adoptedStyleSheets = this.sheets
    }
  }
}
