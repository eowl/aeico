import { expect } from '@esm-bundle/chai'
import { toKebab } from '../../src/utils.js'

describe('toKebab()', () => {
  it('converts PascalCase to kebab-case', () => {
    expect(toKebab('MyComponent')).to.equal('my-component')
  })

  it('converts camelCase to kebab-case', () => {
    expect(toKebab('myComponent')).to.equal('my-component')
  })

  it('handles a single word (PascalCase)', () => {
    expect(toKebab('Button')).to.equal('button')
  })

  it('returns unchanged lowercase single word', () => {
    expect(toKebab('button')).to.equal('button')
  })

  it('handles multi-segment PascalCase', () => {
    expect(toKebab('AeicoButtonGroup')).to.equal('aeico-button-group')
  })

  it('strips leading underscores', () => {
    expect(toKebab('_MyComponent')).to.equal('my-component')
  })

  it('strips leading digits', () => {
    expect(toKebab('123MyEl')).to.equal('my-el')
  })

  it('handles adjacent uppercase letters', () => {
    // regex only breaks on lowercase→uppercase boundary, consecutive caps stay together
    expect(toKebab('AeicoUI')).to.equal('aeico-ui')
  })
})
