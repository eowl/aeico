import { expect } from '@esm-bundle/chai'
import { StyleAdapter } from '../../../src/utils/StyleAdapter.js'
import styleStore from '../../../src/utils/styleStore.js'

/** Create a detached shadow root to use as the test host */
function makeShadowRoot(): { shadowRoot: ShadowRoot; style: CSSStyleDeclaration } {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const shadowRoot = host.attachShadow({ mode: 'open' })
  
  return { shadowRoot, style: host.style }
}

describe('StyleAdapter', () => {
  describe('adoptStyleText()', () => {
    it('adopts a stylesheet from raw CSS text', () => {
      const { shadowRoot, style } = makeShadowRoot()
      const adapter = new StyleAdapter(shadowRoot, style)
      adapter.adoptStyleText('.foo { color: red; }')
      expect(shadowRoot.adoptedStyleSheets).to.have.lengthOf(1)
    })

    it('does not duplicate when the same CSS text is added twice', () => {
      const { shadowRoot, style } = makeShadowRoot()
      const adapter = new StyleAdapter(shadowRoot, style)
      const css = '.dedup { margin: 0; }'
      adapter.adoptStyleText(css)
      adapter.adoptStyleText(css)
      expect(shadowRoot.adoptedStyleSheets).to.have.lengthOf(1)
    })

    it('adds two entries for two different CSS texts', () => {
      const { shadowRoot, style } = makeShadowRoot()
      const adapter = new StyleAdapter(shadowRoot, style)
      adapter.adoptStyleText('.a { color: blue; }')
      adapter.adoptStyleText('.b { color: green; }')
      expect(shadowRoot.adoptedStyleSheets).to.have.lengthOf(2)
    })
  })

  describe('adoptShared()', () => {
    it('adopts registered named style sheets', () => {
      styleStore.preloadStyle('test-adapter-shared', '.shared { color: red; }')
      const { shadowRoot, style } = makeShadowRoot()
      const adapter = new StyleAdapter(shadowRoot, style)
      adapter.adoptShared(['test-adapter-shared'])
      expect(shadowRoot.adoptedStyleSheets).to.have.lengthOf(1)
    })

    it('does not duplicate when the same named sheet is adopted twice', () => {
      styleStore.preloadStyle('test-adapter-dedup', '.dedup-shared { margin: 0; }')
      const { shadowRoot, style } = makeShadowRoot()
      const adapter = new StyleAdapter(shadowRoot, style)
      adapter.adoptShared(['test-adapter-dedup'])
      adapter.adoptShared(['test-adapter-dedup'])
      expect(shadowRoot.adoptedStyleSheets).to.have.lengthOf(1)
    })
  })

  describe('setCssVars()', () => {
    it('writes CSS custom properties to the host element inline style', () => {
      const { shadowRoot, style } = makeShadowRoot()
      const adapter = new StyleAdapter(shadowRoot, style)
      adapter.setCssVars({ '--my-color': 'hotpink', '--my-size': '16px' })
      expect(style.getPropertyValue('--my-color')).to.equal('hotpink')
      expect(style.getPropertyValue('--my-size')).to.equal('16px')
    })
  })

  describe('initialize()', () => {
    const baseOptions = {
      constructorName: 'TestComponent',
      generateStyleVars: () => ({}),
    }

    it('applies Layer 1 applyStyleNames (requires prior preload)', () => {
      styleStore.preloadStyle('test-init-layer1', '.layer1 { color: red; }')
      const { shadowRoot, style } = makeShadowRoot()
      const adapter = new StyleAdapter(shadowRoot, style)
      adapter.initialize({ ...baseOptions, useStyles: ['test-init-layer1'] })
      expect(shadowRoot.adoptedStyleSheets).to.have.lengthOf(1)
    })

    it('applies Layer 2 stylesheets when enabled', () => {
      const { shadowRoot, style } = makeShadowRoot()
      const adapter = new StyleAdapter(shadowRoot, style)
      adapter.initialize({
        ...baseOptions,
        stylesheets: ['.layer2 { color: red; }'],
      })
      expect(shadowRoot.adoptedStyleSheets).to.have.lengthOf(1)
    })

    it('skips Layer 2 when enableStylesheets=false', () => {
      const { shadowRoot, style } = makeShadowRoot()
      const adapter = new StyleAdapter(shadowRoot, style)
      adapter.initialize({
        ...baseOptions,
        enableStylesheets: false,
        stylesheets: ['.layer2 { color: red; }'],
      })
      expect(shadowRoot.adoptedStyleSheets).to.have.lengthOf(0)
    })

    it('is idempotent — second call is a no-op', () => {
      const { shadowRoot, style } = makeShadowRoot()
      const adapter = new StyleAdapter(shadowRoot, style)
      adapter.initialize({ ...baseOptions, stylesheets: ['.once { color: red; }'] })
      adapter.initialize({ ...baseOptions, stylesheets: ['.twice { color: blue; }'] })
      // Only the first call's stylesheet should be present
      expect(shadowRoot.adoptedStyleSheets).to.have.lengthOf(1)
    })

    it('applies Layer 3 pendingStyleProps cssVars via generateStyleVars', () => {
      const { shadowRoot, style } = makeShadowRoot()
      const adapter = new StyleAdapter(shadowRoot, style)
      adapter.initialize({
        ...baseOptions,
        generateStyleVars: () => ({ '--theme-color': 'teal' }),
        pendingStyleProps: { styleSheetNames: [] },
      })
      expect(style.getPropertyValue('--theme-color')).to.equal('teal')
    })
  })

  describe('applyProps()', () => {
    it('adopts a styleSheet passed as CSSStyleSheet instance', () => {
      const { shadowRoot, style } = makeShadowRoot()
      const adapter = new StyleAdapter(shadowRoot, style)

      const sheet = new CSSStyleSheet()
      sheet.replaceSync('.ext { display: flex; }')
      adapter.applyProps({ styleSheet: sheet })
      expect(shadowRoot.adoptedStyleSheets).to.have.lengthOf(1)
    })

    it('adopts from styleSheetText prop', () => {
      const { shadowRoot, style } = makeShadowRoot()
      const adapter = new StyleAdapter(shadowRoot, style)
      adapter.applyProps({ styleSheetText: '.text-prop { color: coral; }' })
      expect(shadowRoot.adoptedStyleSheets).to.have.lengthOf(1)
    })

    it('adopts from styleSheetNames prop (shared registry)', () => {
      styleStore.preloadStyle('test-apply-props', '.apply { display: block; }')
      const { shadowRoot, style } = makeShadowRoot()
      const adapter = new StyleAdapter(shadowRoot, style)
      adapter.applyProps({ styleSheetNames: ['test-apply-props'] })
      expect(shadowRoot.adoptedStyleSheets).to.have.lengthOf(1)
    })
  })
})
