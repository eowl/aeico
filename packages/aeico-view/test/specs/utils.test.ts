import { expect } from '@esm-bundle/chai'
import { camelToKebab } from '../../src/utils.js'

describe('camelToKebab()', () => {
  it('converts a single capital letter', () => {
    expect(camelToKebab('aeButton')).to.equal('ae-button')
  })

  it('converts multiple capital letters', () => {
    expect(camelToKebab('myIconButton')).to.equal('my-icon-button')
  })

  it('converts a leading capital letter', () => {
    expect(camelToKebab('MyWidget')).to.equal('-my-widget')
  })

  it('leaves an already-lowercase string unchanged', () => {
    expect(camelToKebab('div')).to.equal('div')
  })

  it('leaves a string with no uppercase letters unchanged', () => {
    expect(camelToKebab('ae-button')).to.equal('ae-button')
  })

  it('returns an empty string unchanged', () => {
    expect(camelToKebab('')).to.equal('')
  })

  it('handles consecutive capital letters', () => {
    expect(camelToKebab('parseHTML')).to.equal('parse-h-t-m-l')
  })
})
