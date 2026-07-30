/**
 * Standalone usage tests - no aeico-element or any other framework dependency.
 *
 * Two scenarios are covered:
 *  1. Plain DOM target  - html() + render() / Reconciler used against an ordinary <div>.
 *  2. Vanilla web component - a plain HTMLElement subclass that manages its own
 *     rendering lifecycle with aeico-view, without any base class from aeico-element.
 */

import { expect } from '@esm-bundle/chai';
import { html, render } from '../../src/renderer.js';
import Reconciler from '../../src/reconciler.js';

describe('Standalone: plain DOM target (no framework)', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('renders a tree into an arbitrary container with html() + render()', () => {
    render(
      html(({ h1, p }) => {
        h1({ text: 'Hello' });
        p({ text: 'World' });
      }),
      container,
    );

    expect(container.querySelector('h1')?.textContent).to.equal('Hello');
    expect(container.querySelector('p')?.textContent).to.equal('World');
  });

  it('re-renders update only what changed and reuse the same DOM nodes', () => {
    let label = 'initial';

    const tpl = () =>
      html(({ button }) => {
        button({ text: label });
      });

    render(tpl(), container);
    const btn = container.querySelector('button')!;
    expect(btn.textContent).to.equal('initial');

    label = 'updated';
    render(tpl(), container);

    // Same node reference - no recreation
    expect(container.querySelector('button')).to.equal(btn);
    expect(btn.textContent).to.equal('updated');
  });

  it('removes nodes that are no longer in the output after re-render', () => {
    render(
      html(({ p }) => {
        p({ id: 'a' });
        p({ id: 'b' });
      }),
      container,
    );
    expect(container.children.length).to.equal(2);

    render(
      html(({ p }) => {
        p({ id: 'a' });
      }),
      container,
    );
    expect(container.children.length).to.equal(1);
    expect((container.firstElementChild as HTMLElement).id).to.equal('a');
  });

  it('works with a Reconciler instance directly (without html/render wrapper)', () => {
    const reconciler = new Reconciler();

    reconciler.build(container, () => {
      reconciler.div({ id: 'root' }, () => {
        reconciler.span({ text: 'standalone' });
      });
    });

    expect(container.querySelector('#root span')?.textContent).to.equal('standalone');
  });

  it('Reconciler.build() can be called repeatedly to patch in-place', () => {
    const reconciler = new Reconciler();
    let count = 0;

    const render = () =>
      reconciler.build(container, () => {
        reconciler.p({ text: String(count) });
      });

    render();
    const p = container.querySelector('p')!;
    expect(p.textContent).to.equal('0');

    count = 1;
    render();
    // Same <p> node must be reused
    expect(container.querySelector('p')).to.equal(p);
    expect(p.textContent).to.equal('1');
  });

  it('renders keyed lists and reconciles reordering without node recreation', () => {
    const reconciler = new Reconciler();
    let items = ['a', 'b', 'c'];

    const go = () =>
      reconciler.build(container, () => {
        for (const key of items) {
          reconciler.div({ key, text: key });
        }
      });

    go();
    const nodeB = container.querySelector('[data-key="b"]')!;
    expect(nodeB.textContent).to.equal('b');

    // Reverse the list
    items = ['c', 'b', 'a'];
    go();

    expect(container.children[1]).to.equal(nodeB, 'node b should be reused in new position');
    expect(container.children[0].textContent).to.equal('c');
    expect(container.children[2].textContent).to.equal('a');
  });
});


describe('Standalone: vanilla web component (no aeico-element)', () => {
  let host: HTMLDivElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => {
    host.remove();
  });

  it('renders into shadow DOM and reconciles on state change', async () => {
    // Each test uses a unique tag name to avoid CustomElementRegistry conflicts.
    const tag = 'x-counter-standalone-a';

    class XCounterStandaloneA extends HTMLElement {
      count = 0;
      readonly shadow = this.attachShadow({ mode: 'open' });

      connectedCallback() {
        this._render();
      }

      increment() {
        this.count++;
        this._render();
      }

      _render() {
        render(
          html(({ div, span, button }) => {
            div(() => {
              span({ id: 'val', text: String(this.count) });
              button({ id: 'inc', text: '+' });
            });
          }),
          this.shadow,
        );
      }
    }

    customElements.define(tag, XCounterStandaloneA);
    const el = document.createElement(tag) as XCounterStandaloneA;
    host.appendChild(el);
    await customElements.whenDefined(tag);

    expect(el.shadow.querySelector('#val')?.textContent).to.equal('0');

    el.increment();
    expect(el.shadow.querySelector('#val')?.textContent).to.equal('1');

    // The span node itself must be reused across renders
    const valNode = el.shadow.querySelector('#val');
    el.increment();
    expect(el.shadow.querySelector('#val')).to.equal(valNode);
    expect(valNode?.textContent).to.equal('2');
  });

  it('renders into the element itself (no shadow DOM) with a keyed list', async () => {
    const tag = 'x-list-standalone-b';

    class XListStandaloneB extends HTMLElement {
      items = ['apple', 'banana'];

      connectedCallback() {
        this._render();
      }

      _render() {
        render(
          html(({ ul, li }) => {
            ul({ id: 'list' }, () => {
              for (const item of this.items) {
                li({ key: item, text: item });
              }
            });
          }),
          this,
        );
      }
    }

    customElements.define(tag, XListStandaloneB);
    const el = document.createElement(tag) as XListStandaloneB;
    host.appendChild(el);
    await customElements.whenDefined(tag);

    expect(el.querySelectorAll('li').length).to.equal(2);
    expect(el.querySelectorAll('li')[0].textContent).to.equal('apple');

    // Preserve banana's DOM node across a list change
    const bananaNode = el.querySelector('[data-key="banana"]')!;

    el.items = ['cherry', 'banana'];
    el._render();

    expect(el.querySelectorAll('li').length).to.equal(2);
    expect(el.querySelectorAll('li')[0].textContent).to.equal('cherry');
    // banana should be reused (moved, not recreated)
    expect(el.querySelector('[data-key="banana"]')).to.equal(bananaNode);
  });

  it('supports observed attribute changes triggering re-render', async () => {
    const tag = 'x-attr-standalone-c';

    class XAttrStandaloneC extends HTMLElement {
      static observedAttributes = ['label'];

      connectedCallback() {
        this._render();
      }

      attributeChangedCallback() {
        this._render();
      }

      _render() {
        render(
          html(({ p }) => {
            p({ id: 'label', text: this.getAttribute('label') ?? '' });
          }),
          this,
        );
      }
    }

    customElements.define(tag, XAttrStandaloneC);
    const el = document.createElement(tag) as XAttrStandaloneC;
    el.setAttribute('label', 'initial');
    host.appendChild(el);
    await customElements.whenDefined(tag);

    expect(el.querySelector('#label')?.textContent).to.equal('initial');

    el.setAttribute('label', 'changed');
    expect(el.querySelector('#label')?.textContent).to.equal('changed');
  });
});
