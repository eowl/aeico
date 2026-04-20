import { expect } from '@esm-bundle/chai'
import { mount, unmountAll, updated } from '../../helpers/mount.js'
import BaseElement from '../../../src/core/base-element.js'
import { prop, watch } from '../../../src/decorators/index.js'
import type { Props, Watchers } from '../../../src/core/types.js'

afterEach(() => {
  unmountAll()
})

let _counter = 0

describe('@watch decorator', () => {
  describe('basic triggering', () => {
    it('calls decorated method when watched property changes', async () => {
      const tag = `test-watcher-basic-${++_counter}`
      const calls: unknown[] = []

      class El extends BaseElement {
        static props: Props = { count: { type: Number } }
        declare count: number | undefined

        @watch('count')
        onCountChanged(newValue: unknown, oldValue: unknown) {
          calls.push({ newValue, oldValue })
        }
      }
      customElements.define(tag, El)

      const el = await mount<El>(`<${tag}></${tag}>`)
      el.count = 1
      await updated()
      el.count = 2
      await updated()

      expect(calls).to.deep.equal([
        { newValue: 1, oldValue: undefined },
        { newValue: 2, oldValue: 1 },
      ])
    })

    it('passes correct newValue and oldValue', async () => {
      const tag = `test-watcher-values-${++_counter}`
      let captured: { newValue: unknown; oldValue: unknown } | null = null

      class El extends BaseElement {
        static props: Props = { name: { type: String } }
        declare name: string | undefined

        @watch('name')
        onNameChanged(newValue: unknown, oldValue: unknown) {
          captured = { newValue, oldValue }
        }
      }
      customElements.define(tag, El)

      const el = await mount<El>(`<${tag} name="initial"></${tag}>`)
      el.name = 'updated'
      await updated()

      expect(captured).to.deep.equal({ newValue: 'updated', oldValue: 'initial' })
    })
  })

  describe('multiple properties', () => {
    it('@watch with multiple prop names triggers on any of them', async () => {
      const tag = `test-watcher-multi-${++_counter}`
      const triggeredFor: string[] = []

      class El extends BaseElement {
        static props: Props = { min: { type: Number }, max: { type: Number } }
        declare min: number | undefined
        declare max: number | undefined

        @watch('min', 'max')
        onRangeChanged() {
          // record which props are currently set as a snapshot
          triggeredFor.push(`min=${this.min},max=${this.max}`)
        }
      }
      customElements.define(tag, El)

      const el = await mount<El>(`<${tag}></${tag}>`)
      el.min = 0
      await updated()
      el.max = 100
      await updated()

      expect(triggeredFor.length).to.equal(2)
    })
  })

  describe('this binding', () => {
    it('decorated method has correct `this` context', async () => {
      const tag = `test-watcher-this-${++_counter}`
      let capturedThis: unknown = null

      class El extends BaseElement {
        static props: Props = { active: { type: Boolean } }
        declare active: boolean | undefined

        @watch('active')
        onActiveChanged() {
          capturedThis = this
        }
      }
      customElements.define(tag, El)

      const el = await mount<El>(`<${tag}></${tag}>`)
      el.active = true
      await updated()

      expect(capturedThis).to.equal(el)
    })
  })
})

describe('static watchers with inline functions', () => {
  it('supports inline function handler in static watchers', async () => {
    const tag = `test-watcher-fn-${++_counter}`
    const calls: unknown[] = []

    class El extends BaseElement {
      static props: Props = { value: { type: String } }
      static watchers: Watchers = {
        value: (newValue, oldValue) => calls.push({ newValue, oldValue }),
      }
      declare value: string | undefined
    }
    customElements.define(tag, El)

    const el = await mount<El>(`<${tag}></${tag}>`)
    el.value = 'hello'
    await updated()
    el.value = 'world'
    await updated()

    expect(calls).to.deep.equal([
      { newValue: 'hello', oldValue: undefined },
      { newValue: 'world', oldValue: 'hello' },
    ])
  })

  it('supports string method name in static watchers (existing behavior)', async () => {
    const tag = `test-watcher-str-${++_counter}`
    let called = false

    class El extends BaseElement {
      static props: Props = { flag: { type: Boolean } }
      static watchers: Watchers = { flag: 'onFlagChanged' }
      declare flag: boolean | undefined

      onFlagChanged() {
        called = true
      }
    }
    customElements.define(tag, El)

    const el = await mount<El>(`<${tag}></${tag}>`)
    el.flag = true
    await updated()

    expect(called).to.be.true
  })

  it('inline function and string method can coexist in same class', async () => {
    const tag = `test-watcher-coexist-${++_counter}`
    const log: string[] = []

    class El extends BaseElement {
      static props: Props = { a: { type: String }, b: { type: String } }
      static watchers: Watchers = {
        a: (_n) => log.push('fn:a'),
        b: 'onBChanged',
      }
      declare a: string | undefined
      declare b: string | undefined

      onBChanged() {
        log.push('method:b')
      }
    }
    customElements.define(tag, El)

    const el = await mount<El>(`<${tag}></${tag}>`)
    el.a = 'x'
    await updated()
    el.b = 'y'
    await updated()

    expect(log).to.deep.equal(['fn:a', 'method:b'])
  })
})

describe('inheritance', () => {
  it('@watcher from parent class still fires in child class', async () => {
    const tag = `test-watcher-inherit-${++_counter}`
    const calls: string[] = []

    class Parent extends BaseElement {
      static props: Props = { base: { type: String } }
      declare base: string | undefined

      @watch('base')
      onBaseChanged() {
        calls.push('parent:base')
      }
    }

    class Child extends Parent {
      static props: Props = { extra: { type: String } }
      declare extra: string | undefined

      @watch('extra')
      onExtraChanged() {
        calls.push('child:extra')
      }
    }
    customElements.define(tag, Child)

    const el = await mount<Child>(`<${tag}></${tag}>`)
    el.base = 'b'
    await updated()
    el.extra = 'e'
    await updated()

    expect(calls).to.include('parent:base')
    expect(calls).to.include('child:extra')
  })

  it('child static watchers do not override parent @watcher entries', async () => {
    const tag = `test-watcher-inherit2-${++_counter}`
    const calls: string[] = []

    class Parent extends BaseElement {
      static props: Props = { shared: { type: String } }
      declare shared: string | undefined

      @watch('shared')
      onSharedFromParent() {
        calls.push('parent')
      }
    }

    class Child extends Parent {
      static watchers: Watchers = { extra: 'onExtra' }
      static props: Props = { extra: { type: String } }
      declare extra: string | undefined

      onExtra() {
        calls.push('child:extra')
      }
    }
    customElements.define(tag, Child)

    const el = await mount<Child>(`<${tag}></${tag}>`)
    el.shared = 'v'
    await updated()
    el.extra = 'w'
    await updated()

    expect(calls).to.include('parent')
    expect(calls).to.include('child:extra')
  })
})
