import { expect } from '@esm-bundle/chai';
import { localeRegistry, LocaleStore } from '../../src/locale.js';

describe('localeRegistry', () => {
  // localeRegistry is a singleton; tests run sequentially in the same browser context.
  // After setProvider() is called, provider is retained for subsequent tests.

  it('provider is null before any setProvider() call', () => {
    expect(localeRegistry.provider).to.be.null;
  });

  it('setProvider() accepts a valid LocaleProvider', () => {
    const store = new LocaleStore();
    localeRegistry.setProvider(store);
    expect(localeRegistry.provider).to.equal(store);
  });

  it('setProvider() rejects a provider missing t()', () => {
    const before = localeRegistry.provider;
    localeRegistry.setProvider({ subscribe: () => () => {} } as any);
    expect(localeRegistry.provider).to.equal(before);
  });

  it('setProvider() rejects a provider missing subscribe()', () => {
    const before = localeRegistry.provider;
    localeRegistry.setProvider({ t: () => '' } as any);
    expect(localeRegistry.provider).to.equal(before);
  });

  it('setProvider() can replace the existing provider', () => {
    const second = new LocaleStore();
    localeRegistry.setProvider(second);
    expect(localeRegistry.provider).to.equal(second);
  });
});
