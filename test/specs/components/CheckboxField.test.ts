import { expect } from '@esm-bundle/chai'
import { mount, unmountAll, updated, whenDefined } from '../../helpers/mount.js'
import { randomItem } from '../../helpers/utils.js'
import CheckboxField from '../../../src/components/CheckboxField.js'

const TAG_NAME = 'ae-checkbox'

before(async () => {
  CheckboxField.register()
  await whenDefined(TAG_NAME)
})

afterEach(() => {
  unmountAll()
})

describe('CheckboxField', () => {
  describe('registration', () => {
    it(`is registered as "${TAG_NAME}"`, () => {
      expect(customElements.get(TAG_NAME)).to.equal(CheckboxField)
    })
    
    it('document.createElement returns a CheckboxField instance with a shadow root', async () => {
      const el = document.createElement(TAG_NAME)
      expect(el).to.be.instanceOf(CheckboxField)
      expect(el.shadowRoot).to.not.be.null
    })
  })

  describe('rendering', () => {
    it('renders a checkbox input inside shadow DOM', async () => {
      const el = await mount<CheckboxField>(`<${TAG_NAME}></${TAG_NAME}>`)
      expect(el.shadowRoot!.querySelector('input[type="checkbox"]')).to.exist
    })

    it ('sets the checked state based on the "checked" attribute', async () => {
      const checkedValStr = randomItem(['checked', 'checked="true"'])
      const el = await mount<CheckboxField>(`<${TAG_NAME} ${checkedValStr}></${TAG_NAME}>`)
      await updated()
      const input = el.shadowRoot!.querySelector('input[type="checkbox"]') as HTMLInputElement
      expect(input.checked).to.be.true
    })

    it ('sets the checked state is false', async () => {
      const checkedValStr = randomItem(['', 'checked="false"'])
      const el = await mount<CheckboxField>(`<${TAG_NAME} ${checkedValStr}></${TAG_NAME}>`)
      await updated()

      const input = el.shadowRoot!.querySelector('input[type="checkbox"]') as HTMLInputElement
      expect(input.checked).to.be.false
    })

    it('sets the variant attribute on the container element', async () => {
      const variant = randomItem(['checkbox', 'toggle'])
      const el = await mount<CheckboxField>(`<${TAG_NAME} variant="${variant}"></${TAG_NAME}>`)
      await updated()

      const container = el.shadowRoot!.querySelector('.checkbox-container')
      expect(container).to.exist
      expect(container!.classList.contains(`variant-${variant}`)).to.be.true
    })

    it('renders a toggle slider when variant is "toggle"', async () => {
      const el = await mount<CheckboxField>(`<${TAG_NAME} variant="toggle"></${TAG_NAME}>`)
      await updated()
      const slider = el.shadowRoot!.querySelector('.toggle-slider')
      expect(slider).to.exist
    })

    it('does not render a toggle slider when variant is "checkbox"', async () => {
      const el = await mount<CheckboxField>(`<${TAG_NAME} variant="checkbox"></${TAG_NAME}>`)
      await updated()
      const slider = el.shadowRoot!.querySelector('.toggle-slider')
      expect(slider).to.not.exist
    })
  })
})
