import { expect } from '@esm-bundle/chai'
import { setRenderContext, clearRenderContext, getCurrentContext } from '../../src/render-context.js'
import type { Updatable } from '../../src/render-context.js'

function makeUpdatable(): Updatable {
  return { update() {}, isConnected: true }
}

afterEach(() => {
  clearRenderContext()
})

describe('render-context', () => {
  describe('getCurrentContext()', () => {
    it('returns null by default', () => {
      expect(getCurrentContext()).to.be.null
    })

    it('returns the context set via setRenderContext()', () => {
      const ctx = makeUpdatable()
      setRenderContext(ctx)
      expect(getCurrentContext()).to.equal(ctx)
    })
  })

  describe('setRenderContext()', () => {
    it('replaces a previously set context', () => {
      const a = makeUpdatable()
      const b = makeUpdatable()
      setRenderContext(a)
      setRenderContext(b)
      expect(getCurrentContext()).to.equal(b)
    })
  })

  describe('clearRenderContext()', () => {
    it('resets the current context to null', () => {
      const ctx = makeUpdatable()
      setRenderContext(ctx)
      clearRenderContext()
      expect(getCurrentContext()).to.be.null
    })

    it('is safe to call when context is already null', () => {
      expect(() => clearRenderContext()).to.not.throw()
      expect(getCurrentContext()).to.be.null
    })
  })
})
