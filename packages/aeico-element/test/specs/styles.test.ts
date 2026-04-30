import { expect } from '@esm-bundle/chai';
import styleStore, { css, StyleResult, StyleAdapter } from '../../src/styles.js';

describe('styleStore', () => {
  describe('getStyle() with string', () => {
    it('returns a StyleResult with a valid sheet', () => {
      const result = styleStore.getStyle('body { color: red; }');
      expect(result).to.be.instanceOf(StyleResult);
      expect(result.sheet).to.be.instanceOf(CSSStyleSheet);
    });

    it('returns the same StyleResult for identical CSS text (deduplication)', () => {
      const text = '.store-dedup { margin: 0; }';
      const a = styleStore.getStyle(text);
      const b = styleStore.getStyle(text);
      expect(a).to.equal(b);
    });

    it('returns different StyleResult for different CSS text', () => {
      const a = styleStore.getStyle('.sa { color: blue; }');
      const b = styleStore.getStyle('.sb { color: green; }');
      expect(a).to.not.equal(b);
    });
  });

  describe('getStyle() with CSSStyleSheet', () => {
    it('returns a canonical StyleResult for identical content', () => {
      const cssText = '.normalize { padding: 4px; }';
      const sheetA = new CSSStyleSheet();
      sheetA.replaceSync(cssText);
      const sheetB = new CSSStyleSheet();
      sheetB.replaceSync(cssText);

      const resultA = styleStore.getStyle(sheetA);
      const resultB = styleStore.getStyle(sheetB);
      expect(resultA).to.equal(resultB);
    });

    it('caches the same StyleResult on repeated calls', () => {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync('.weakmap { display: block; }');
      const first = styleStore.getStyle(sheet);
      const second = styleStore.getStyle(sheet);
      expect(first).to.equal(second);
    });
  });

  describe('getStyle() with StyleResult', () => {
    it('returns the same StyleResult passed in', () => {
      const result = css('.passthrough { color: red; }');
      expect(styleStore.getStyle(result)).to.equal(result);
    });
  });

  describe('css()', () => {
    it('returns a StyleResult', () => {
      const result = css('.d { padding: 0; }');
      expect(result).to.be.instanceOf(StyleResult);
    });

    it('deduplicates by content �?same text returns same StyleResult', () => {
      const text = '.dedup { display: block; }';
      const a = css(text);
      const b = css(text);
      expect(a).to.equal(b);
    });

    it('returns different StyleResult for different text', () => {
      const a = css('.x { color: red; }');
      const b = css('.y { color: blue; }');
      expect(a).to.not.equal(b);
    });
  });
});

// ── StyleAdapter ──────────────────────────────────────────────────────────────

function makeShadowRoot(): { shadowRoot: ShadowRoot; style: CSSStyleDeclaration } {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const shadowRoot = host.attachShadow({ mode: 'open' });

  return { shadowRoot, style: host.style };
}

describe('StyleAdapter', () => {
  describe('initialize() with styles', () => {
    it('adopts a stylesheet from CSS text', () => {
      const { shadowRoot, style } = makeShadowRoot();
      const adapter = new StyleAdapter(shadowRoot, style);
      adapter.initialize({
        constructorName: 'Test',
        styles: ['.foo { color: red; }'],
      });
      expect(shadowRoot.adoptedStyleSheets).to.have.lengthOf(1);
    });

    it('does not duplicate when the same CSS text appears twice', () => {
      const { shadowRoot, style } = makeShadowRoot();
      const adapter = new StyleAdapter(shadowRoot, style);
      const cssText = '.dedup { margin: 0; }';
      adapter.initialize({
        constructorName: 'Test',
        styles: [cssText, cssText],
      });
      expect(shadowRoot.adoptedStyleSheets).to.have.lengthOf(1);
    });

    it('adds two entries for two different styles', () => {
      const { shadowRoot, style } = makeShadowRoot();
      const adapter = new StyleAdapter(shadowRoot, style);
      adapter.initialize({
        constructorName: 'Test',
        styles: ['.a { color: blue; }', '.b { color: green; }'],
      });
      expect(shadowRoot.adoptedStyleSheets).to.have.lengthOf(2);
    });
  });

  describe('initialize() with CSSStyleSheet', () => {
    it('adopts a pre-built CSSStyleSheet', () => {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync('.ext { display: flex; }');
      const { shadowRoot, style } = makeShadowRoot();
      const adapter = new StyleAdapter(shadowRoot, style);
      adapter.initialize({
        constructorName: 'Test',
        styles: [sheet],
      });
      expect(shadowRoot.adoptedStyleSheets).to.have.lengthOf(1);
    });
  });

  describe('initialize() with cssVars option', () => {
    it('writes CSS custom properties to the host element inline style', () => {
      const { shadowRoot, style } = makeShadowRoot();
      const adapter = new StyleAdapter(shadowRoot, style);
      adapter.initialize({
        constructorName: 'Test',
        options: {
          cssVars: { '--my-color': 'hotpink', '--my-size': '16px' },
        },
      });
      expect(style.getPropertyValue('--my-color')).to.equal('hotpink');
      expect(style.getPropertyValue('--my-size')).to.equal('16px');
    });
  });

  describe('initialize() idempotency', () => {
    it('is idempotent �?second call is a no-op', () => {
      const { shadowRoot, style } = makeShadowRoot();
      const adapter = new StyleAdapter(shadowRoot, style);
      adapter.initialize({
        constructorName: 'Test',
        styles: ['.once { color: red; }'],
      });
      adapter.initialize({
        constructorName: 'Test',
        styles: ['.twice { color: blue; }'],
      });
      expect(shadowRoot.adoptedStyleSheets).to.have.lengthOf(1);
    });
  });

  describe('initialize() with enable=false', () => {
    it('skips styles when enable is false', () => {
      const { shadowRoot, style } = makeShadowRoot();
      const adapter = new StyleAdapter(shadowRoot, style);
      adapter.initialize({
        constructorName: 'Test',
        styles: ['.skip { color: red; }'],
        options: { enable: false },
      });
      expect(shadowRoot.adoptedStyleSheets).to.have.lengthOf(0);
    });
  });
});
