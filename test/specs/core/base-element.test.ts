import { expect } from '@esm-bundle/chai'
import { mount, unmountAll, updated } from '../../helpers/mount.js'
import BaseElement from '../../../src/core/BaseElement.js'

afterEach(() => {
  unmountAll()
})

let _counter = 0
function createTestElement(Base = BaseElement) {
  const tag = `test-build-el-${++_counter}`
  const El = class extends Base {
    callBuild(cb: () => void) { 
      return (this as any).build(cb) 
    }
    
    callBuildNested() { 
      (this as any).build(() => { (this as any).build(() => {}) })
    }

    get testTags() { 
      return (this as any).tags 
    }

    get testContainer() { 
      return (this as any).container 
    }
  }

  customElements.define(tag, El)

  return { tag, El }
}

describe('BaseElement', () => {
  it('should have a static properties object', () => {
    expect(BaseElement).to.have.property('properties')
    expect(BaseElement.properties).to.be.an('object')
  })

  describe('build()', () => {
    it('execute callback then render to shadowRoot', async () => {
      const { tag } = createTestElement()
      const el = await mount<InstanceType<ReturnType<typeof createTestElement>['El']>>(`<${tag}></${tag}>`)

      el.callBuild(() => {
        const { div } = el.testTags
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
          const { span } = el.testTags
          span({ textContent: 'recovered' })
        })
      }).not.to.throw()

      expect(el.shadowRoot!.querySelector('span')!.textContent).to.equal('recovered')
    })

    it('multiple build calls reuse DOM nodes through diffing, only updating content', async () => {
      const { tag } = createTestElement()
      const el = await mount<InstanceType<ReturnType<typeof createTestElement>['El']>>(`<${tag}></${tag}>`)

      el.callBuild(() => {
        const { div } = el.testTags
        div({ className: 'box', textContent: 'first' })
      })
      const firstNode = el.shadowRoot!.querySelector('.box')

      el.callBuild(() => {
        const { div } = el.testTags
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
        callBuild(cb: () => void) { return (this as any).build(cb) }
        get testTags()            { return (this as any).tags }
      }
      customElements.define(tag, NoShadowEl)

      const el = await mount<NoShadowEl>(`<${tag}></${tag}>`)

      el.callBuild(() => {
        const { p } = el.testTags
        p({ textContent: 'light dom' })
      })

      expect(el.shadowRoot).to.be.null
      expect(el.querySelector('p')!.textContent).to.equal('light dom')
    })

    it('render() automatically calls build via executeUpdate, shadowRoot has content after first render', async () => {
      const tag = `test-auto-render-${++_counter}`
      class AutoRenderEl extends BaseElement {
        protected render() {
          (this as any).build(() => {
            const { span } = (this as any).tags
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
})
