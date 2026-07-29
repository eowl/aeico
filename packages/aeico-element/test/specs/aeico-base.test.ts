import { expect } from '@esm-bundle/chai';
import { mount, unmountAll, updated } from '../helpers/mount.js';
import AeicoBase from '../../src/aeico-base.js';
import { html } from 'aeico-view';
import type { Props } from '../../src/types.js';

afterEach(() => {
  unmountAll();
});

let _counter = 0;

describe('AeicoBase', () => {
  it('subclass can define its own props', async () => {
    const tag = `test-aeico-base-extend-${++_counter}`;

    class MyEl extends AeicoBase {
      static override props: Props = {
        label: { type: String },
      };
      declare label: string | undefined;
    }
    customElements.define(tag, MyEl);

    const el = await mount<MyEl>(`<${tag} label="hello"></${tag}>`);
    expect(el.label).to.equal('hello');
  });

  it('inherits define() from BaseElement', () => {
    class AutoRegBase extends AeicoBase {}
    AutoRegBase.define('auto-reg-base');
    expect(customElements.get('auto-reg-base')).to.equal(AutoRegBase);
  });

  it('supports render() override', async () => {
    const tag = `test-aeico-base-render-${++_counter}`;

    class El extends AeicoBase {
      protected render() {
        return html(({ span }) => {
          span({ textContent: 'hello' });
        });
      }
    }
    customElements.define(tag, El);

    const el = await mount<El>(`<${tag}></${tag}>`);
    await updated();

    expect(el.shadowRoot!.querySelector('span')!.textContent).to.equal('hello');
  });
});
