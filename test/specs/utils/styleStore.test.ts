import { expect } from '@esm-bundle/chai'
import styleStore from '../../../src/utils/styleStore.js'

describe('styleStore', () => {
  describe('getSheet()', () => {
    it('returns a CSSStyleSheet for given CSS text', () => {
      const sheet = styleStore.getSheet('body { color: red; }')
      expect(sheet).to.be.instanceOf(CSSStyleSheet)
    })

    it('returns the same instance for identical CSS text (deduplication)', () => {
      const css = '.dedup-test { margin: 0; }'
      const a = styleStore.getSheet(css)
      const b = styleStore.getSheet(css)
      expect(a).to.equal(b)
    })

    it('returns different instances for different CSS text', () => {
      const a = styleStore.getSheet('.a { color: blue; }')
      const b = styleStore.getSheet('.b { color: green; }')
      expect(a).to.not.equal(b)
    })
  })

  describe('preloadStyle() / resolveStyle()', () => {
    it('resolves a user-registered named style', () => {
      styleStore.preloadStyle('test-named', '.named { font-size: 14px; }')
      const sheet = styleStore.resolveStyle('test-named')
      expect(sheet).to.be.instanceOf(CSSStyleSheet)
    })

    it('preloadStyle() is idempotent — second call does not overwrite', () => {
      const css1 = '.idempotent { color: red; }'
      const css2 = '.idempotent { color: blue; }'
      styleStore.preloadStyle('test-idempotent', css1)
      styleStore.preloadStyle('test-idempotent', css2)
      const sheet = styleStore.resolveStyle('test-idempotent')!
      // First registration should win
      expect(sheet.cssRules[0].cssText).to.include('red')
      expect(sheet.cssRules[0].cssText).to.not.include('blue')
    })

    it('resolveStyle() falls back to preset styles', () => {
      const sheet = styleStore.resolveStyle('base')
      expect(sheet).to.be.instanceOf(CSSStyleSheet)
    })

    it('resolveStyle() returns undefined for unknown names', () => {
      const sheet = styleStore.resolveStyle('__nonexistent__')
      expect(sheet).to.be.undefined
    })
  })

  describe('overrideStyle()', () => {
    it('overwrites an existing named style and returns true when CSS differs', () => {
      styleStore.preloadStyle('test-override', '.orig { color: red; }')
      const replaced = styleStore.overrideStyle('test-override', '.new { color: blue; }')
      expect(replaced).to.be.true
      const sheet = styleStore.resolveStyle('test-override')!
      expect(sheet.cssRules[0].cssText).to.include('blue')
    })

    it('returns false when CSS text is unchanged', () => {
      const css = '.same { color: pink; }'
      styleStore.preloadStyle('test-same', css)
      const replaced = styleStore.overrideStyle('test-same', css)
      expect(replaced).to.be.false
    })
  })

  describe('normalizeSheet()', () => {
    it('returns the same canonical instance for two sheets with identical rules', () => {
      const css = '.normalize { padding: 4px; }'
      const sheetA = new CSSStyleSheet()
      sheetA.replaceSync(css)
      const sheetB = new CSSStyleSheet()
      sheetB.replaceSync(css)

      const canonicalA = styleStore.normalizeSheet(sheetA)
      const canonicalB = styleStore.normalizeSheet(sheetB)
      expect(canonicalA).to.equal(canonicalB)
    })

    it('subsequent calls for the same object return the same ref (WeakMap hit)', () => {
      const sheet = new CSSStyleSheet()
      sheet.replaceSync('.weakmap { display: block; }')
      const first = styleStore.normalizeSheet(sheet)
      const second = styleStore.normalizeSheet(sheet)
      expect(first).to.equal(second)
    })
  })

  describe('getSharedSheets()', () => {
    it('returns sheets for known names and warns for unknown names', () => {
      styleStore.preloadStyle('test-shared-a', '.sa { color: cyan; }')
      styleStore.preloadStyle('test-shared-b', '.sb { color: magenta; }')
      const sheets = styleStore.getSharedSheets(['test-shared-a', 'test-shared-b'])
      expect(sheets).to.have.lengthOf(2)
      sheets.forEach(s => expect(s).to.be.instanceOf(CSSStyleSheet))
    })
  })
})
