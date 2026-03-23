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
  it('should have a static props object', () => {
    expect(BaseElement).to.have.property('props')
    expect(BaseElement.props).to.be.an('object')
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

  describe('custom parser and formatter', () => {
    it('parser transforms attribute string into a custom value when property is read', async () => {
      const tag = `test-parser-read-${++_counter}`
      class El extends BaseElement {
        static props = {
          score: { parser: (v: string | null) => (v ? parseInt(v) * 2 : 0) }
        }
        declare score: number
      }
      customElements.define(tag, El)
      const el = await mount<El>(`<${tag} score="21"></${tag}>`)

      expect(el.score).to.equal(42)
    })

    it('parser receives null when the attribute is removed', async () => {
      const tag = `test-parser-null-${++_counter}`
      const received: (string | null)[] = []
      class El extends BaseElement {
        static props = {
          val: {
            parser: (v: string | null) => {
              received.push(v)
              return v ?? 'default'
            }
          }
        }
        declare val: string
      }
      customElements.define(tag, El)
      const el = await mount<El>(`<${tag} val="hello"></${tag}>`)
      el.removeAttribute('val')
      await updated()

      expect(received).to.include(null)
      expect(el.val).to.equal('default')
    })

    it('parser receives the declared type as its second argument', async () => {
      const tag = `test-parser-type-${++_counter}`
      let capturedType: unknown
      class El extends BaseElement {
        static props = {
          count: {
            type: Number,
            parser: (v: string | null, type?: any) => {
              capturedType = type
              return v ? Number(v) : 0
            }
          }
        }
        declare count: number
      }
      customElements.define(tag, El)
      await mount<El>(`<${tag} count="5"></${tag}>`)

      expect(capturedType).to.equal(Number)
    })

    it('formatter serializes property value to attribute string when property is set', async () => {
      const tag = `test-formatter-set-${++_counter}`
      class El extends BaseElement {
        static props = {
          names: { formatter: (v: string[]) => v.join(',') }
        }
        declare names: string[]
      }
      customElements.define(tag, El)
      const el = await mount<El>(`<${tag}></${tag}>`)
      el.names = ['a', 'b', 'c']

      expect(el.getAttribute('names')).to.equal('a,b,c')
    })

    it('formatter receives the declared type as its second argument', async () => {
      const tag = `test-formatter-type-${++_counter}`
      let capturedType: unknown
      class El extends BaseElement {
        static props = {
          active: {
            type: Boolean,
            formatter: (v: boolean, type?: any) => {
              capturedType = type
              
              return v ? 'yes' : 'no'
            }
          }
        }
        declare active: boolean
      }
      customElements.define(tag, El)
      const el = await mount<El>(`<${tag}></${tag}>`)
      el.active = true

      expect(capturedType).to.equal(Boolean)
      expect(el.getAttribute('active')).to.equal('yes')
    })

    it('formatter returning null sets the attribute to an empty string', async () => {
      const tag = `test-formatter-null-${++_counter}`
      class El extends BaseElement {
        static props = {
          mood: { formatter: (_v: string) => null }
        }
        declare mood: string
      }
      customElements.define(tag, El)
      const el = await mount<El>(`<${tag}></${tag}>`)
      el.mood = 'happy'

      expect(el.getAttribute('mood')).to.equal('')
    })

    it('parser and formatter roundtrip: set property → formatter writes attribute → parser reads it back', async () => {
      const tag = `test-roundtrip-${++_counter}`
      class El extends BaseElement {
        static props = {
          items: {
            formatter: (v: number[]) => v.join(';'),
            parser: (v: string | null) => (v ? v.split(';').map(Number) : [])
          }
        }
        declare items: number[]
      }
      customElements.define(tag, El)
      const el = await mount<El>(`<${tag}></${tag}>`)
      el.items = [1, 2, 3]

      expect(el.getAttribute('items')).to.equal('1;2;3')
      expect(el.items).to.deep.equal([1, 2, 3])
    })
  })
})
