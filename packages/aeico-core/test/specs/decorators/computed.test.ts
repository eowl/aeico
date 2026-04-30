import { expect } from '@esm-bundle/chai'
import { mount, unmountAll, updated } from '../../test/helpers/mount.js'
import BaseElement from '../../src/core/base-element.js'
import { prop, computed } from '../../src/decorators/index.js'

afterEach(() => {
  unmountAll()
})

let _counter = 0

describe('@computed decorator', () => {
  describe('basic computation', () => {
    it('returns computed value based on deps', async () => {
      const tag = `test-computed-basic-${++_counter}`

      class El extends BaseElement {
        @prop({ type: Number }) accessor price: number | undefined
        @prop({ type: Number }) accessor qty: number | undefined

        @computed('price', 'qty')
        get total() {
          return (this.price ?? 0) * (this.qty ?? 0)
        }
      }
      customElements.define(tag, El)

      const el = await mount<El>(`<${tag} price="10" qty="3"></${tag}>`)
      expect((el as any).total).to.equal(30)
    })

    it('updates when a dependency changes', async () => {
      const tag = `test-computed-update-${++_counter}`

      class El extends BaseElement {
        @prop({ type: Number }) accessor a: number | undefined
        @prop({ type: Number }) accessor b: number | undefined

        @computed('a', 'b')
        get sum() {
          return (this.a ?? 0) + (this.b ?? 0)
        }
      }
      customElements.define(tag, El)

      const el = await mount<El>(`<${tag} a="1" b="2"></${tag}>`)
      expect((el as any).sum).to.equal(3)

      el.a = 10
      await updated()
      expect((el as any).sum).to.equal(12)
    })
  })

  describe('caching', () => {
    it('does not recompute when deps have not changed', async () => {
      const tag = `test-computed-cache-${++_counter}`
      let computeCount = 0

      class El extends BaseElement {
        @prop({ type: String }) accessor name: string | undefined
        @prop({ type: String }) accessor unrelated: string | undefined

        @computed('name')
        get greeting() {
          computeCount++
          return `Hello, ${this.name}`
        }
      }
      customElements.define(tag, El)

      const el = await mount<El>(`<${tag} name="Alice"></${tag}>`)
      await updated()

      computeCount = 0
      ;(el as any).greeting // first access â€?computes and caches
      ;(el as any).greeting // second access â€?should hit cache
      expect(computeCount).to.equal(1)

      el.unrelated = 'changed'
      await updated()
      ;(el as any).greeting // dep (name) unchanged â€?still cached
      expect(computeCount).to.equal(1)
    })

    it('recomputes after dependency changes', async () => {
      const tag = `test-computed-recalc-${++_counter}`
      let computeCount = 0

      class El extends BaseElement {
        @prop({ type: String }) accessor name: string | undefined

        @computed('name')
        get upper() {
          computeCount++
          return (this.name ?? '').toUpperCase()
        }
      }
      customElements.define(tag, El)

      const el = await mount<El>(`<${tag} name="hello"></${tag}>`)
      await updated()

      computeCount = 0
      ;(el as any).upper // cache it
      expect(computeCount).to.equal(1)

      el.name = 'world'
      await updated()
      const result = (el as any).upper // should recompute
      expect(computeCount).to.equal(2)
      expect(result).to.equal('WORLD')
    })
  })

  describe('coexistence with static computed', () => {
    it('@computed and static computed work together', async () => {
      const tag = `test-computed-mixed-${++_counter}`

      class El extends BaseElement {
        static props = { x: { type: Number }, y: { type: Number } }
        declare x?: number
        declare y?: number

        static computed = {
          product: {
            deps: ['x', 'y'],
            compute: (el: any) => (el.x ?? 0) * (el.y ?? 0),
          },
        }

        @prop({ type: String }) accessor tag2: string | undefined

        @computed('tag2', 'x')
        get label() {
          return `${this.tag2 ?? ''}-${this.x ?? 0}`
        }
      }
      customElements.define(tag, El)

      const el = await mount<El>(`<${tag} x="4" y="5" tag2="val"></${tag}>`)
      expect((el as any).product).to.equal(20)
      expect((el as any).label).to.equal('val-4')
    })
  })

  describe('inheritance', () => {
    it('child @computed works alongside parent static computed', async () => {
      const parentTag = `test-computed-parent-${++_counter}`

      class Parent extends BaseElement {
        static props = { size: { type: Number } }
        declare size?: number

        static computed = {
          doubled: {
            deps: ['size'],
            compute: (el: any) => (el.size ?? 0) * 2,
          },
        }
      }
      customElements.define(parentTag, Parent)

      const childTag = `test-computed-child-${++_counter}`

      class Child extends Parent {
        @prop({ type: String }) accessor unit: string | undefined

        @computed('size', 'unit')
        get display() {
          return `${this.size ?? 0}${this.unit ?? ''}`
        }
      }
      customElements.define(childTag, Child)

      const el = await mount<Child>(`<${childTag} size="10" unit="px"></${childTag}>`)
      expect((el as any).doubled).to.equal(20)
      expect((el as any).display).to.equal('10px')
    })
  })
})


