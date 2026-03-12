import { expect } from '@esm-bundle/chai'
import { mount, unmountAll, updated, whenDefined } from '../helpers/mount.js'
import CheckboxField from '../../src/components/CheckboxField.js'

const TAG_NAME = 'checkbox-field'

before(async () => {
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
})
