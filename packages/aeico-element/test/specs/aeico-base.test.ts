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
  it('has a disabled prop defined with type Boolean', () => {
    expect(AeicoBase.props).to.have.property('disabled');
    expect(AeicoBase.props.disabled).to.deep.include({ type: Boolean });
  });

  it('disabled prop reflects to attribute', async () => {
    const tag = `test-aeico-base-disabled-${++_counter}`;
    class El extends AeicoBase {}
    customElements.define(tag, El);

    const el = await mount<El>(`<${tag}></${tag}>`);
    el.disabled = true;
    expect(el.getAttribute('disabled')).to.equal('true');
  });

  it('disabled attribute initializes property', async () => {
    const tag = `test-aeico-base-attr-${++_counter}`;
    class El extends AeicoBase {}
    customElements.define(tag, El);

    const el = await mount<El>(`<${tag} disabled="true"></${tag}>`);
    expect(el.disabled).to.be.true;
  });

  it('disabled=false removes the attribute', async () => {
    const tag = `test-aeico-base-disabled-false-${++_counter}`;
    class El extends AeicoBase {}
    customElements.define(tag, El);

    const el = await mount<El>(`<${tag} disabled="true"></${tag}>`);
    el.disabled = false;
    expect(el.hasAttribute('disabled')).to.be.false;
  });

  it('subclass can extend props alongside disabled', async () => {
    const tag = `test-aeico-base-extend-${++_counter}`;

    class MyEl extends AeicoBase {
      static override props: Props = {
        ...AeicoBase.props,
        label: { type: String },
      };
      declare label: string | undefined;
    }
    customElements.define(tag, MyEl);

    const el = await mount<MyEl>(`<${tag} label="hello"></${tag}>`);
    expect(el.label).to.equal('hello');
    expect(el.disabled).to.be.undefined;
  });

  it('inherits register() from BaseElement', () => {
    class AutoRegBase extends AeicoBase {}
    AutoRegBase.register();
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
