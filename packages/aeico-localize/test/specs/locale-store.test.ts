import { expect } from '@esm-bundle/chai'
import { LocaleStore } from '../../src/locale.js'

describe('LocaleStore', () => {
  let store: LocaleStore

  beforeEach(() => {
    store = new LocaleStore()
  })

  describe('initial state', () => {
    it('lang is empty string', () => {
      expect(store.lang).to.equal('')
    })

    it('initialized is false', () => {
      expect(store.initialized).to.be.false
    })
  })

  describe('t()', () => {
    it('returns key when not initialized', () => {
      expect(store.t('foo.bar')).to.equal('foo.bar')
    })

    it('returns fallback when not initialized', () => {
      expect(store.t('foo.bar', 'Fallback')).to.equal('Fallback')
    })

    it('resolves a top-level key', () => {
      store.update('en', { hello: 'Hello' })
      expect(store.t('hello')).to.equal('Hello')
    })

    it('resolves a dot-nested key', () => {
      store.update('en', { buttons: { save: 'Save', cancel: 'Cancel' } })
      expect(store.t('buttons.save')).to.equal('Save')
    })

    it('resolves a deeply nested key', () => {
      store.update('en', { a: { b: { c: 'deep' } } })
      expect(store.t('a.b.c')).to.equal('deep')
    })

    it('returns key when key not found after init', () => {
      store.update('en', { hello: 'Hello' })
      expect(store.t('missing')).to.equal('missing')
    })

    it('returns fallback when key not found after init', () => {
      store.update('en', { hello: 'Hello' })
      expect(store.t('missing', 'Default')).to.equal('Default')
    })

    it('returns key when intermediate segment is not an object', () => {
      store.update('en', { foo: 'bar' })
      expect(store.t('foo.nested')).to.equal('foo.nested')
    })
  })

  describe('update()', () => {
    it('sets lang', () => {
      store.update('zh-CN', {})
      expect(store.lang).to.equal('zh-CN')
    })

    it('sets initialized to true', () => {
      store.update('en', {})
      expect(store.initialized).to.be.true
    })

    it('calls all subscribers', () => {
      let calls = 0
      store.subscribe(() => calls++)
      store.update('en', {})
      expect(calls).to.equal(1)
    })

    it('replaces resources on subsequent updates', () => {
      store.update('en', { hello: 'Hello' })
      store.update('zh', { hello: '你好' })
      expect(store.t('hello')).to.equal('你好')
    })

    it('updates lang on each call', () => {
      store.update('en', {})
      store.update('zh-CN', {})
      expect(store.lang).to.equal('zh-CN')
    })
  })

  describe('subscribe()', () => {
    it('returned unsubscribe stops future callbacks', () => {
      let calls = 0
      const unsub = store.subscribe(() => calls++)
      unsub()
      store.update('en', {})
      expect(calls).to.equal(0)
    })

    it('multiple subscribers are each called once', () => {
      let a = 0, b = 0
      store.subscribe(() => a++)
      store.subscribe(() => b++)
      store.update('en', {})
      expect(a).to.equal(1)
      expect(b).to.equal(1)
    })

    it('unsubscribing one does not affect others', () => {
      let a = 0, b = 0
      const unsub = store.subscribe(() => a++)
      store.subscribe(() => b++)
      unsub()
      store.update('en', {})
      expect(a).to.equal(0)
      expect(b).to.equal(1)
    })
  })
})
