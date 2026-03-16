import { expect } from '@esm-bundle/chai'
import { mount, unmountAll, updated, whenDefined } from '../../helpers/mount.js'
import InputField from '../../../src/components/InputField.js'

before(async () => {
  InputField.register()
  await whenDefined('input-field')
})

afterEach(() => {
  unmountAll()
})

describe('InputField', () => {
  describe('registration', () => {
    it('is registered as "input-field"', () => {
      expect(customElements.get('input-field')).to.equal(InputField)
    })

    it('document.createElement returns an InputField instance with a shadow root', () => {
      const el = document.createElement('input-field')
      expect(el).to.be.instanceOf(InputField)
      expect(el.shadowRoot).to.not.be.null
    })
  })

  describe('rendering', () => {
    it('renders an <input> element inside shadow DOM', async () => {
      const el = await mount<InputField>('<input-field></input-field>')
      expect(el.shadowRoot!.querySelector('input')).to.exist
    })

    it('sets the type attribute on the inner <input>', async () => {
      const el = await mount<InputField>('<input-field type="email"></input-field>')
      await updated()
      expect(el.shadowRoot!.querySelector<HTMLInputElement>('input')!.type).to.equal('email')
    })

    it('sets the placeholder attribute on the inner <input>', async () => {
      const el = await mount<InputField>('<input-field placeholder="Enter email"></input-field>')
      await updated()
      expect(el.shadowRoot!.querySelector<HTMLInputElement>('input')!.placeholder).to.equal('Enter email')
    })
  })

  describe('CSS ?inline import (styleStore integration)', () => {
    it('has at least one adopted stylesheet after connecting to DOM', async () => {
      const el = await mount<InputField>('<input-field></input-field>')
      expect(el.shadowRoot!.adoptedStyleSheets.length).to.be.greaterThan(0)
    })

    it('adopted stylesheet contains input-field CSS rules', async () => {
      const el = await mount<InputField>('<input-field></input-field>')
      const allRules = el.shadowRoot!.adoptedStyleSheets
        .flatMap(sheet => Array.from(sheet.cssRules))
        .map(rule => rule.cssText)
        .join(' ')
      expect(allRules).to.include('input')
    })
  })

  describe('value binding', () => {
    it('reflects value to the inner input', async () => {
      const el = await mount<InputField>('<input-field value="hello"></input-field>')
      await updated()
      expect(el.shadowRoot!.querySelector<HTMLInputElement>('input')!.value).to.equal('hello')
    })
  })
})
