import { expect } from '@esm-bundle/chai'
import { compose } from '../../../src/mixins/compose.js'
import type { Constructor } from '../../../src/mixins/compose.js'
import AeicoElement from '../../../src/core/aeico-element.js'
import { mount, unmountAll } from '../../helpers/mount.js'

describe('compose', () => {
  afterEach(() => {
    unmountAll()
  })

  it('should compose a single mixin', async () => {
    // Define a simple mixin that adds a property
    function WithCounter<T extends Constructor>(Base: T) {
      return class extends Base {
        count = 0
        increment() {
          this.count++
        }
      }
    }

    const ComposedClass = compose(WithCounter)(AeicoElement)
    customElements.define('test-single-mixin', ComposedClass)
    
    const el = await mount<any>('<test-single-mixin></test-single-mixin>')

    expect(el.count).to.equal(0)
    el.increment()
    expect(el.count).to.equal(1)
  })

  it('should compose multiple mixins in order', async () => {
    // Mixin that adds a name property
    function WithName<T extends Constructor>(Base: T) {
      return class extends Base {
        name = 'unnamed'
        setName(name: string) {
          this.name = name
        }
      }
    }

    // Mixin that adds a greeting method
    function WithGreeting<T extends Constructor>(Base: T) {
      return class extends Base {
        greet(this: any) {
          return `Hello, ${this.name}!`
        }
      }
    }

    const ComposedClass = compose(WithName, WithGreeting)(AeicoElement)
    customElements.define('test-multiple-mixins', ComposedClass)
    
    const el = await mount<any>('<test-multiple-mixins></test-multiple-mixins>')

    expect(el.name).to.equal('unnamed')
    expect(el.greet()).to.equal('Hello, unnamed!')
    
    el.setName('World')
    expect(el.greet()).to.equal('Hello, World!')
  })

  it('should preserve base class methods', async () => {
    function WithFeature<T extends Constructor>(Base: T) {
      return class extends Base {
        feature = 'enabled'
      }
    }

    const ComposedClass = compose(WithFeature)(AeicoElement)
    customElements.define('test-preserve-methods', ComposedClass)
    
    const el = await mount<any>('<test-preserve-methods></test-preserve-methods>')

    // AeicoElement methods should still exist
    expect(el.generateStyleVars).to.be.a('function')
    expect(el.feature).to.equal('enabled')
  })

  it('should allow mixins to call lifecycle methods', async () => {
    let connectedCount = 0
    let disconnectedCount = 0

    function WithLifecycle<T extends Constructor>(Base: T) {
      return class extends Base {
        connectedCallback() {
          super.connectedCallback?.()
          connectedCount++
        }

        disconnectedCallback() {
          super.disconnectedCallback?.()
          disconnectedCount++
        }
      }
    }

    const ComposedClass = compose(WithLifecycle)(AeicoElement)
    customElements.define('test-lifecycle', ComposedClass)

    const el = await mount<HTMLElement>('<test-lifecycle></test-lifecycle>')
    expect(connectedCount).to.equal(1)

    el.remove()
    expect(disconnectedCount).to.equal(1)
  })

  it('should chain multiple mixins with lifecycle methods', async () => {
    const callOrder: string[] = []

    function WithFirstCallback<T extends Constructor>(Base: T) {
      return class extends Base {
        connectedCallback() {
          super.connectedCallback?.()
          callOrder.push('first')
        }
      }
    }

    function WithSecondCallback<T extends Constructor>(Base: T) {
      return class extends Base {
        connectedCallback() {
          super.connectedCallback?.()
          callOrder.push('second')
        }
      }
    }

    const ComposedClass = compose(WithFirstCallback, WithSecondCallback)(AeicoElement)
    customElements.define('test-chain', ComposedClass)

    await mount<HTMLElement>('<test-chain></test-chain>')
    
    // Mixins applied left-to-right, so callbacks execute in order
    expect(callOrder).to.deep.equal(['first', 'second'])
  })

  it('should work with empty mixin array', async () => {
    const ComposedClass = compose()(AeicoElement)
    customElements.define('test-empty-mixins', ComposedClass)
    
    const el = await mount('<test-empty-mixins></test-empty-mixins>')
    
    // Should return the base class unchanged
    expect(el).to.be.instanceOf(AeicoElement)
  })

  it('should allow mixins to override each other', async () => {
    function WithColorRed<T extends Constructor>(Base: T) {
      return class extends Base {
        color = 'red'
      }
    }

    function WithColorBlue<T extends Constructor>(Base: T) {
      return class extends Base {
        color = 'blue'
      }
    }

    // Last mixin wins
    const ComposedClass = compose(WithColorRed, WithColorBlue)(AeicoElement)
    customElements.define('test-override', ComposedClass)
    
    const el = await mount<any>('<test-override></test-override>')

    expect(el.color).to.equal('blue')
  })

  it('should support complex mixin interactions', async () => {
    // Mixin that maintains state
    function WithState<T extends Constructor>(Base: T) {
      return class extends Base {
        private _state: Record<string, any> = {}
        
        setState(key: string, value: any) {
          this._state[key] = value
        }
        
        getState(key: string) {
          return this._state[key]
        }
      }
    }

    // Mixin that uses state
    function WithLogger<T extends Constructor>(Base: T) {
      return class extends Base {
        log(message: string) {
          const state = (this as any).getState('logs') || []
          state.push(message)
          ;(this as any).setState('logs', state)
        }
        
        getLogs() {
          return (this as any).getState('logs') || []
        }
      }
    }

    const ComposedClass = compose(WithState, WithLogger)(AeicoElement)
    customElements.define('test-complex', ComposedClass)
    
    const el = await mount<any>('<test-complex></test-complex>')

    el.log('first')
    el.log('second')
    
    expect(el.getLogs()).to.deep.equal(['first', 'second'])
  })

  it('should work with actual Themeable and Localizable mixins', async () => {
    // Import real mixins
    const { Themeable } = await import('../../../src/mixins/themeable.js')
    const { Localizable } = await import('../../../src/localize/localizable.js')
    
    const ComposedClass = compose(Themeable, Localizable)(AeicoElement)
    customElements.define('test-real-mixins', ComposedClass)
    
    const el = await mount<any>('<test-real-mixins></test-real-mixins>')

    // Should have both theme and i18n capabilities
    expect(el.theme).to.be.undefined // not set yet
    expect(el.t).to.be.a('function')
    expect(el.enableI18n).to.be.undefined // not set yet
  })
})
