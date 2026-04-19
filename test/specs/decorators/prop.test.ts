import { expect } from '@esm-bundle/chai'
import { mount, unmountAll, updated } from '../../helpers/mount.js'
import BaseElement from '../../../src/core/base-element.js'
import { prop } from '../../../src/decorators/index.js'
import type { Props } from '../../../src/core/types.js'

afterEach(() => {
  unmountAll()
})

let _counter = 0

describe('@prop decorator', () => {
  describe('type handling', () => {
    it('String prop reflects to attribute and attribute updates property', async () => {
      const tag = `test-dec-str-${++_counter}`

      class El extends BaseElement {
        @prop({ type: String }) accessor title: string | undefined
      }
      customElements.define(tag, El)

      const el = await mount<El>(`<${tag}></${tag}>`)
      el.title = 'Hello'
      expect(el.getAttribute('title')).to.equal('Hello')

      el.setAttribute('title', 'World')
      expect(el.title).to.equal('World')
    })

    it('Number prop deserializes from attribute', async () => {
      const tag = `test-dec-num-${++_counter}`

      class El extends BaseElement {
        @prop({ type: Number }) accessor count: number | undefined
      }
      customElements.define(tag, El)

      const el = await mount<El>(`<${tag} count="42"></${tag}>`)
      expect(el.count).to.equal(42)

      el.count = 7
      expect(el.getAttribute('count')).to.equal('7')
    })

    it('Boolean prop handles presence attribute', async () => {
      const tag = `test-dec-bool-${++_counter}`

      class El extends BaseElement {
        @prop({ type: Boolean }) accessor active: boolean | undefined
      }
      customElements.define(tag, El)

      const el = await mount<El>(`<${tag} active></${tag}>`)
      expect(el.active).to.equal(true)

      el.active = false
      expect(el.getAttribute('active')).to.equal('false')
    })
  })

  describe('reflect and observe options', () => {
    it('reflect: false prevents property from reflecting to attribute', async () => {
      const tag = `test-dec-noreflect-${++_counter}`

      class El extends BaseElement {
        @prop({ type: String, reflect: false }) accessor secret: string | undefined
      }
      customElements.define(tag, El)

      const el = await mount<El>(`<${tag}></${tag}>`)
      el.secret = 'hidden'
      expect(el.getAttribute('secret')).to.be.null
    })

    it('observe: false prevents attribute changes from updating property', async () => {
      const tag = `test-dec-noobserve-${++_counter}`

      class El extends BaseElement {
        @prop({ type: Boolean, observe: false }) accessor internal: boolean | undefined
      }
      customElements.define(tag, El)

      const el = await mount<El>(`<${tag}></${tag}>`)
      el.setAttribute('internal', 'true')
      await updated()
      expect(el.internal).to.be.undefined
    })
  })

  describe('calling patterns', () => {
    it('bare @prop works as default declaration', async () => {
      const tag = `test-dec-bare-${++_counter}`

      class El extends BaseElement {
        @prop accessor label: string | undefined
      }
      customElements.define(tag, El)

      const el = await mount<El>(`<${tag} label="hi"></${tag}>`)
      expect(el.label).to.equal('hi')

      el.label = 'bye'
      expect(el.getAttribute('label')).to.equal('bye')
    })

    it('@prop() with empty options works same as bare', async () => {
      const tag = `test-dec-empty-${++_counter}`

      class El extends BaseElement {
        @prop() accessor name: string | undefined
      }
      customElements.define(tag, El)

      const el = await mount<El>(`<${tag} name="test"></${tag}>`)
      expect(el.name).to.equal('test')

      el.name = 'updated'
      expect(el.getAttribute('name')).to.equal('updated')
    })
  })

  describe('coexistence with static props', () => {
    it('same class can have both static props and @prop', async () => {
      const tag = `test-dec-mixed-${++_counter}`

      class El extends BaseElement {
        static props: Props = { age: { type: Number } }
        declare age?: number

        @prop({ type: String }) accessor color: string | undefined
      }
      customElements.define(tag, El)

      const el = await mount<El>(`<${tag} age="25" color="red"></${tag}>`)
      expect(el.age).to.equal(25)
      expect(el.color).to.equal('red')

      el.age = 30
      el.color = 'blue'
      expect(el.getAttribute('age')).to.equal('30')
      expect(el.getAttribute('color')).to.equal('blue')
    })

    it('child @prop inherits parent static props', async () => {
      const parentTag = `test-dec-parent-${++_counter}`

      class Parent extends BaseElement {
        static props: Props = { size: { type: Number } }
        declare size?: number
      }
      customElements.define(parentTag, Parent)

      const childTag = `test-dec-child-${++_counter}`

      class Child extends Parent {
        @prop({ type: String }) accessor variant: string | undefined
      }
      customElements.define(childTag, Child)

      const el = await mount<Child>(`<${childTag} size="10" variant="primary"></${childTag}>`)
      expect(el.size).to.equal(10)
      expect(el.variant).to.equal('primary')
    })
  })

  describe('reactivity', () => {
    it('setter triggers update() and render cycle', async () => {
      const tag = `test-dec-render-${++_counter}`
      let renderCount = 0

      class El extends BaseElement {
        @prop({ type: String }) accessor message: string | undefined

        protected render() {
          renderCount++
        }
      }
      customElements.define(tag, El)

      const el = await mount<El>(`<${tag}></${tag}>`)
      await updated()

      renderCount = 0
      el.message = 'hello'
      await updated()

      expect(renderCount).to.equal(1)
    })
  })

  describe('observedAttributes', () => {
    it('includes decorator-defined props', () => {
      const tag = `test-dec-observed-${++_counter}`

      class El extends BaseElement {
        @prop({ type: String }) accessor title: string | undefined
        @prop({ type: Number }) accessor count: number | undefined
        @prop({ type: Boolean, observe: false }) accessor hidden: boolean | undefined
      }
      customElements.define(tag, El)

      const observed = (El as unknown as typeof BaseElement).observedAttributes
      expect(observed).to.include('title')
      expect(observed).to.include('count')
      expect(observed).to.not.include('hidden')
    })
  })
})
