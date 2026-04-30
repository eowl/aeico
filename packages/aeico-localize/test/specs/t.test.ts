import { expect } from '@esm-bundle/chai';
import { t, locale } from '../../src/index.js';

// `t` is locale.t bound to the global `locale` singleton.
// Each test updates `locale` to control the translation table.

describe('t()', () => {
  it('returns the translation for a known key', () => {
    locale.update('en', { greeting: 'Hello' });
    expect(t('greeting')).to.equal('Hello');
  });

  it('resolves a dot-nested key', () => {
    locale.update('en', { buttons: { save: 'Save' } });
    expect(t('buttons.save')).to.equal('Save');
  });

  it('returns key when key is not found', () => {
    locale.update('en', {});
    expect(t('not.found')).to.equal('not.found');
  });

  it('returns fallback when key is not found', () => {
    locale.update('en', {});
    expect(t('not.found', 'Fallback')).to.equal('Fallback');
  });

  it('reflects locale changes after update()', () => {
    locale.update('en', { msg: 'Hello' });
    expect(t('msg')).to.equal('Hello');
    locale.update('zh', { msg: '你好' });
    expect(t('msg')).to.equal('你好');
  });
});
