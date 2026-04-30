import { expect } from '@esm-bundle/chai'
import { mount, unmountAll, updated } from '../helpers/mount.js'
import AeicoElement from '../../src/aeico-element.js'
import { css } from '../../src/styles.js'
import type { StyleEntry } from '../../src/styles.js'

afterEach(() => {
  unmountAll()
})

let _counter = 0

describe('AeicoElement', () => {
  describe('static styles', () => {
    it('applies a CSS string as an adopted stylesheet', async () => {
      const tag = `test-ae-styles-str-${++_counter}`

      class El extends AeicoElement {
        protected static styles = '.box { color: red; }'
      }
      customElements.define(tag, El)

      const el = await mount<El>(`<${tag}></${tag}>`)
      expect(el.shadowRoot!.adoptedStyleSheets).to.have.lengthOf(1)
    })

    it('applies a StyleResult as an adopted stylesheet', async () => {
      const tag = `test-ae-styles-result-${++_counter}`
      const sheet = css('.foo { color: blue; }')

      class El extends AeicoElement {
        protected static styles = sheet
      }
      customElements.define(tag, El)

      const el = await mount<El>(`<${tag}></${tag}>`)
      expect(el.shadowRoot!.adoptedStyleSheets).to.have.lengthOf(1)
    })

    it('applies multiple stylesheets from an array', async () => {
      const tag = `test-ae-styles-arr-${++_counter}`

      class El extends AeicoElement {
        protected static styles = [
          '.a { color: red; }',
          '.b { color: blue; }',
        ]
      }
      customElements.define(tag, El)

      const el = await mount<El>(`<${tag}></${tag}>`)
      expect(el.shadowRoot!.adoptedStyleSheets).to.have.lengthOf(2)
    })

    it('element with no static styles has no adopted stylesheets', async () => {
      const tag = `test-ae-no-styles-${++_counter}`

      class El extends AeicoElement {}
      customElements.define(tag, El)

      const el = await mount<El>(`<${tag}></${tag}>`)
      expect(el.shadowRoot!.adoptedStyleSheets).to.have.lengthOf(0)
    })

    it('subclass inherits and can extend parent styles', async () => {
      const tag = `test-ae-inherit-styles-${++_counter}`
      const parentSheet = css('.parent { color: red; }')
      const childSheet = css('.child { color: blue; }')

      class Parent extends AeicoElement {
        protected static override styles: StyleEntry = parentSheet
      }
      class Child extends Parent {
        protected static override styles: StyleEntry = [parentSheet, childSheet]
      }
      customElements.define(tag, Child)

      const el = await mount<Child>(`<${tag}></${tag}>`)
      expect(el.shadowRoot!.adoptedStyleSheets).to.have.lengthOf(2)
    })
  })

  describe('create()', () => {
    it('returns a new instance of the component', () => {
      const tag = `test-ae-create-basic-${++_counter}`
      class MyEl extends AeicoElement {}
      customElements.define(tag, MyEl)
      const instance = MyEl.create()
      expect(instance).to.be.instanceOf(MyEl)
    })

    it('sets provided config properties on the instance', () => {
      const tag = `test-ae-create-props-${++_counter}`
      class MyEl extends AeicoElement {
        static props = { label: { type: String } }
        declare label: string | undefined
      }
      customElements.define(tag, MyEl)
      const instance = MyEl.create({ label: 'hello' }) as MyEl
      expect(instance.label).to.equal('hello')
    })

    it('ignores config keys that are not properties on the instance', () => {
      const tag = `test-ae-create-ignore-${++_counter}`
      class MyEl extends AeicoElement {}
      customElements.define(tag, MyEl)
      expect(() => MyEl.create({ nonExistent: 'value' })).to.not.throw()
    })

    it('applies cssVars to the host element style after connecting to the DOM', async () => {
      const tag = `test-ae-create-cssvars-${++_counter}`
      class El extends AeicoElement {}
      customElements.define(tag, El)

      const el = El.create({ cssVars: { '--my-color': 'hotpink' } }) as El
      document.body.appendChild(el)
      await updated()

      expect(el.style.getPropertyValue('--my-color')).to.equal('hotpink')
      document.body.removeChild(el)
    })
  })
})
