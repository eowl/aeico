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

    it('should have toKebab() static method', () => {
      expect(AeicoComponent.toKebab).to.be.a('function')
      expect(AeicoComponent.toKebab('MyComponent')).to.equal('my-component')
    })
  })

  describe('instance with mixin methods', () => {
    it('should create instances with Themeable methods', async () => {
      class TestComponent extends AeicoComponent {
        static register() {
          customElements.define('test-aeico-component', TestComponent)
        }
      }
      
      TestComponent.register()
      const el = await mount<InstanceType<typeof TestComponent>>('<test-aeico-component></test-aeico-component>')
      
      // Check that element is properly instantiated
      expect(el).to.be.instanceOf(TestComponent)
      expect(el.shadowRoot).to.exist
    })
  })
})
