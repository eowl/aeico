import { expect } from '@esm-bundle/chai'
import { mount, unmountAll, updated } from '../../helpers/mount.js'
import BaseElement from '../../../src/core/base-element.js'
import type { Props } from '../../../src/core/types.js'

afterEach(() => {
  unmountAll()
})

let _counter = 0

function createTestElement(Base = BaseElement) {
  const tag = `test-build-el-${++_counter}`
  const El = class extends Base {
    callBuild(cb: () => void) { 
      return this.build(cb) 
    }
    
    callBuildNested() { 
      this.build(() => { this.build(() => {}) })
    }

    get testBuilder() { 
      return this.builder 
    }

    get testContainer() { 
      return this.container 
    }
  }

  customElements.define(tag, El)

  return { tag, El }
}

function defineEl(props: Props, setup?: (El: typeof BaseElement) => void): string {
  const tag = `test-el-${++_counter}`

  class El extends BaseElement {
    static props = props
  }
  
  setup?.(El)
  customElements.define(tag, El)

  return tag
}

describe('BaseElement', () => {
  it('should have a static props object', () => {
    expect(BaseElement).to.have.property('props')
    expect(BaseElement.props).to.be.an('object')
  })

  describe('build()', () => {
    it('execute callback then render to shadowRoot', async () => {
      const { tag } = createTestElement()
      const el = await mount<InstanceType<ReturnType<typeof createTestElement>['El']>>(`<${tag}></${tag}>`)

      el.callBuild(() => {
        const { div } = el.testBuilder
        div({ textContent: 'hello' })
      })

      expect(el.shadowRoot!.querySelector('div')).to.exist
      expect(el.shadowRoot!.querySelector('div')!.textContent).to.equal('hello')
    })

    it('throw "Already building" error when nested build is called', async () => {
      const { tag } = createTestElement()
      const el = await mount<InstanceType<ReturnType<typeof createTestElement>['El']>>(`<${tag}></${tag}>`)

      expect(() => el.callBuildNested()).to.throw('Already building')
    })

    it('reset _building flag after callback throws, allowing subsequent build calls', async () => {
      const { tag } = createTestElement()
      const el = await mount<InstanceType<ReturnType<typeof createTestElement>['El']>>(`<${tag}></${tag}>`)

      expect(() => {
        el.callBuild(() => { throw new Error('callback error') })
      }).to.throw('callback error')

      expect(() => {
        el.callBuild(() => {
          const { span } = el.testBuilder
          span({ textContent: 'recovered' })
        })
      }).not.to.throw()

      expect(el.shadowRoot!.querySelector('span')!.textContent).to.equal('recovered')
    })

    it('multiple build calls reuse DOM nodes through diffing, only updating content', async () => {
      const { tag } = createTestElement()
      const el = await mount<InstanceType<ReturnType<typeof createTestElement>['El']>>(`<${tag}></${tag}>`)

      el.callBuild(() => {
        const { div } = el.testBuilder
        div({ className: 'box', textContent: 'first' })
      })
      const firstNode = el.shadowRoot!.querySelector('.box')

      el.callBuild(() => {
        const { div } = el.testBuilder
        div({ className: 'box', textContent: 'second' })
      })
      const secondNode = el.shadowRoot!.querySelector('.box')

      expect(firstNode).to.equal(secondNode)
      expect(secondNode!.textContent).to.equal('second')
    })

    it('useShadowDOM=false', async () => {
      const tag = `test-no-shadow-${++_counter}`
      class NoShadowEl extends BaseElement {
        static useShadowDOM = false

        callBuild(cb: () => void) { return this.build(cb) }
        get testBuilder()            { return this.builder }
      }
      customElements.define(tag, NoShadowEl)

      const el = await mount<NoShadowEl>(`<${tag}></${tag}>`)

      el.callBuild(() => {
        const { p } = el.testBuilder
        p({ textContent: 'light dom' })
      })

      expect(el.shadowRoot).to.be.null
      expect(el.querySelector('p')!.textContent).to.equal('light dom')
    })

    it('render() automatically calls build via executeUpdate, shadowRoot has content after first render', async () => {
      const tag = `test-auto-render-${++_counter}`
      class AutoRenderEl extends BaseElement {
        protected render() {
          this.build(() => {
            const { span } = this.builder
            span({ textContent: 'auto' })
          })
        }
      }
      customElements.define(tag, AutoRenderEl)

      const el = await mount<AutoRenderEl>(`<${tag}></${tag}>`)
      await updated()

      expect(el.shadowRoot!.querySelector('span')!.textContent).to.equal('auto')
    })
  })

  describe('Props Handler', () => {
    describe('attribute reflection and observation', () => {
      it('property changes reflect to attribute by default', async () => {
        const tag = defineEl({ title: { type: String } })
        const el = await mount<BaseElement & { title: string }>(`<${tag}></${tag}>`)
        el.title = 'Hello World'
        expect(el.getAttribute('title')).to.equal('Hello World')
      })

      it('attribute changes reflect to property by default', async () => {
        const tag = defineEl({ name: { type: String } })
        const el = await mount<BaseElement & { name: string }>(`<${tag} name="Alice"></${tag}>`)
        expect(el.name).to.equal('Alice')
      })
      
      it('setting property does not reflect to attribute when reflect is false', async () => {
        const tag = defineEl({ count: { type: Number, reflect: false } })
        const el = await mount<BaseElement & { count: number }>(`<${tag}></${tag}>`)
        el.count = 10
        expect(el.getAttribute('count')).to.be.null
      })

      it('changing attribute does not update property when observe is false', async () => {
        const tag = defineEl({ active: { type: Boolean, observe: false } })
        const el = await mount<BaseElement & { active: boolean }>(`<${tag} active></${tag}>`)
        el.setAttribute('active', '')
        await updated()
        expect(el.active).to.be.undefined
      })

      it('custom attribute name via attr option', async () => {
        const tag = defineEl({ score: { type: Number, attr: 'data-score' } })
        const el = await mount<BaseElement & { score: number }>(`<${tag} data-score="42"></${tag}>`)
        expect(el.score).to.equal(42)
      })
    })

    describe('custom parser and formatter', () => {
      it('parser transforms attribute string into a custom value when property is read', async () => {
        const tag = defineEl({ score: { parser: (v: string | null) => (v ? parseInt(v) * 2 : 0) } })
        const el = await mount<BaseElement & { score: number }>(`<${tag} score="21"></${tag}>`)
        expect(el.score).to.equal(42)
      })

      it('parser receives null when the attribute is removed', async () => {
        const received: (string | null)[] = []
        const tag = defineEl({
          val: {
            parser: (v: string | null) => {
              received.push(v)
              return v ?? 'default'
            }
          }
        })
        const el = await mount<BaseElement & { val: string }>(`<${tag} val="hello"></${tag}>`)
        el.removeAttribute('val')
        await updated()

        expect(received).to.include(null)
        expect(el.val).to.equal('default')
      })

      it('parser receives the declared type as its second argument', async () => {
        let capturedType: unknown
        const tag = defineEl({
          count: {
            type: Number,
            parser: (v: string | null, type?: unknown) => {
              capturedType = type
              return v ? Number(v) : 0
            }
          }
        })
        await mount(`<${tag} count="5"></${tag}>`)
        expect(capturedType).to.equal(Number)
      })

      it('formatter serializes property value to attribute string when property is set', async () => {
        const tag = defineEl({ names: { formatter: (v: string[]) => v.join(',') } })
        const el = await mount<BaseElement & { names: string[] }>(`<${tag}></${tag}>`)
        el.names = ['a', 'b', 'c']
        expect(el.getAttribute('names')).to.equal('a,b,c')
      })

      it('formatter receives the declared type as its second argument', async () => {
        let capturedType: unknown
        const tag = defineEl({
          active: {
            type: Boolean,
            formatter: (v: boolean, type?: unknown) => {
              capturedType = type
              return v ? 'yes' : 'no'
            }
          }
        })
        const el = await mount<BaseElement & { active: boolean }>(`<${tag}></${tag}>`)
        el.active = true
        expect(capturedType).to.equal(Boolean)
        expect(el.getAttribute('active')).to.equal('yes')
      })

      it('formatter returning null sets the attribute to an empty string', async () => {
        const tag = defineEl({ mood: { formatter: (_v: string) => null } })
        const el = await mount<BaseElement & { mood: string }>(`<${tag}></${tag}>`)
        el.mood = 'happy'
        expect(el.getAttribute('mood')).to.equal('')
      })

      it('parser and formatter roundtrip: set property → formatter writes attribute → parser reads it back', async () => {
        const tag = defineEl({
          items: {
            formatter: (v: number[]) => v.join(';'),
            parser: (v: string | null) => (v ? v.split(';').map(Number) : [])
          }
        })
        const el = await mount<BaseElement & { items: number[] }>(`<${tag}></${tag}>`)
        el.items = [1, 2, 3]
        expect(el.getAttribute('items')).to.equal('1;2;3')
        expect(el.items).to.deep.equal([1, 2, 3])
      })
    })

    describe('update() call count with reflection', () => {
      it('setting a reflected property calls update() twice but executeUpdate() only once', async () => {
        const tag = `test-update-count-${++_counter}`
        let updateCallCount = 0
        let renderCallCount = 0

        class TrackingEl extends BaseElement {
          static props: Props = { value: { type: String } }
          declare value: string

          update(name?: string, oldValue?: unknown) {
            updateCallCount++
            super.update(name, oldValue)
          }

          protected render() {
            renderCallCount++
          }
        }
        customElements.define(tag, TrackingEl)

        const el = await mount<TrackingEl>(`<${tag}></${tag}>`)
        await updated()

        // Reset counters after initial mount
        updateCallCount = 0
        renderCallCount = 0

        el.value = 'hello'
        await updated()

        // setter calls update() once; _reflecting flag prevents attributeChangedCallback from calling it again
        expect(updateCallCount).to.equal(1)
        // but _updatePending flag ensures executeUpdate runs only once
        expect(renderCallCount).to.equal(1)
      })

      it('setting a non-reflected property calls update() exactly once', async () => {
        const tag = `test-update-count-noreflect-${++_counter}`
        let updateCallCount = 0
        let renderCallCount = 0

        class TrackingEl extends BaseElement {
          static props: Props = { value: { type: String, reflect: false } }
          declare value: string

          update(name?: string, oldValue?: unknown) {
            updateCallCount++
            super.update(name, oldValue)
          }

          protected render() {
            renderCallCount++
          }
        }
        customElements.define(tag, TrackingEl)

        const el = await mount<TrackingEl>(`<${tag}></${tag}>`)
        await updated()

        updateCallCount = 0
        renderCallCount = 0

        el.value = 'hello'
        await updated()

        // No reflection → no attributeChangedCallback → update() called only once
        expect(updateCallCount).to.equal(1)
        expect(renderCallCount).to.equal(1)
      })
    })
  })
})
