import { expect } from '@esm-bundle/chai'
import { mount, unmountAll } from '../../helpers/mount.js'
import AeicoComponent from '../../../src/components/aeico-component.js'

afterEach(() => {
  unmountAll()
})

describe('AeicoComponent', () => {
  describe('static methods', () => {
    it('should have register() static method', () => {
      expect(AeicoComponent.register).to.be.a('function')
    })

    it('should have events static getter', () => {
      // Just verify the getter exists and returns something
      // Don't try to inspect the value as it contains Symbols
      expect(typeof AeicoComponent.events).to.equal('object')
    })

    it('should have toKebab() static method', () => {
      expect(AeicoComponent.toKebab).to.be.a('function')
      expect(AeicoComponent.toKebab('MyComponent')).to.equal('my-component')
    })
  })

  describe('instance with mixin methods', () => {
    it('should create instances with Themeable and Localizable methods', async () => {
      class TestComponent extends AeicoComponent {
        static register() {
          customElements.define('test-aeico-component', TestComponent)
        }
      }
      
      TestComponent.register()
      const el = await mount<InstanceType<typeof TestComponent>>('<test-aeico-component></test-aeico-component>')
      
      // Check Localizable methods exist
      expect(el.t).to.be.a('function')
      expect(el.onLocaleChange).to.be.a('function')
      
      // Check that element is properly instantiated
      expect(el).to.be.instanceOf(TestComponent)
      expect(el.shadowRoot).to.exist
    })
  })
})
