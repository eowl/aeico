import { expect } from '@esm-bundle/chai';
import { html, render, getActiveBuilder, tags, RenderResult } from '../../src/renderer.js';
import ElementBuilder from '../../src/element-builder.js';

describe('html()', () => {
  it('returns a RenderResult', () => {
    const result = html(() => {});
    expect(result).to.be.instanceOf(RenderResult);
  });

  it('stores the callback as _cb', () => {
    const cb = (b: ElementBuilder) => {
      b.div();
    };
    const result = html(cb);
    expect(result._cb).to.equal(cb);
  });

  it('does not execute the callback immediately', () => {
    let called = false;
    html(() => {
      called = true;
    });
    expect(called).to.be.false;
  });
});

describe('render()', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('appends elements from the template to the root', () => {
    render(
      html(({ div }) => {
        div({ textContent: 'hello' });
      }),
      container,
    );
    expect(container.children.length).to.equal(1);
    expect(container.firstElementChild?.textContent).to.equal('hello');
  });

  it('returns void', () => {
    const result = render(
      html(() => {}),
      container,
    );
    expect(result).to.be.undefined;
  });

  it('reuses the same builder instance across renders to the same root', () => {
    render(
      html(({ div }) => {
        div({ id: 'first' });
      }),
      container,
    );
    const el = container.firstElementChild;

    render(
      html(({ div }) => {
        div({ id: 'first', className: 'updated' });
      }),
      container,
    );
    expect(container.firstElementChild).to.equal(el);
    expect(container.firstElementChild?.className).to.equal('updated');
  });

  it('creates separate builder instances for different roots', () => {
    const root2 = document.createElement('div');
    document.body.appendChild(root2);

    render(
      html(({ div }) => {
        div({ textContent: 'root1' });
      }),
      container,
    );
    render(
      html(({ div }) => {
        div({ textContent: 'root2' });
      }),
      root2,
    );

    expect(container.firstElementChild?.textContent).to.equal('root1');
    expect(root2.firstElementChild?.textContent).to.equal('root2');

    root2.remove();
  });

  it('removes elements no longer in the template', () => {
    render(
      html(({ div }) => {
        div({ id: 'a' });
        div({ id: 'b' });
      }),
      container,
    );
    expect(container.children.length).to.equal(2);

    render(
      html(({ div }) => {
        div({ id: 'a' });
      }),
      container,
    );
    expect(container.children.length).to.equal(1);
    expect(container.firstElementChild?.id).to.equal('a');
  });

  it('passes an ElementBuilder to the callback', () => {
    let captured: unknown;
    render(
      html((b) => {
        captured = b;
      }),
      container,
    );
    expect(captured).to.be.instanceOf(ElementBuilder);
  });

  it('supports shadow root as render target', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });

    render(
      html(({ span }) => {
        span({ textContent: 'in shadow' });
      }),
      shadow,
    );
    expect(shadow.firstElementChild?.textContent).to.equal('in shadow');

    host.remove();
  });
});

describe('getActiveBuilder()', () => {
  it('throws when called outside a render() context', () => {
    expect(() => getActiveBuilder()).to.throw(
      'getActiveBuilder() called outside of a render() context.',
    );
  });

  it('returns the active builder during render()', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    let captured: ElementBuilder | null = null;

    render(
      html(() => {
        captured = getActiveBuilder();
      }),
      container,
    );

    expect(captured).to.be.instanceOf(ElementBuilder);
    container.remove();
  });

  it('is null again after render() finishes', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    render(
      html(() => {}),
      container,
    );
    expect(() => getActiveBuilder()).to.throw();
    container.remove();
  });
});

describe('tags', () => {
  it('throws when accessed outside a render() context', () => {
    expect(() => (tags as any).div()).to.throw(
      'getActiveBuilder() called outside of a render() context.',
    );
  });

  it('delegates property access to the active builder during render()', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    render(
      html(() => {
        const { div, span } = tags;
        div({}, () => {
          span({ textContent: 'via tags' });
        });
      }),
      container,
    );

    expect(container.querySelector('span')?.textContent).to.equal('via tags');
    container.remove();
  });

  it('allows destructuring tag helpers inside render()', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    render(
      html(() => {
        const { ul, li } = tags;
        ul({}, () => {
          li({ textContent: 'one' });
          li({ textContent: 'two' });
        });
      }),
      container,
    );

    expect(container.querySelectorAll('li').length).to.equal(2);
    container.remove();
  });
});
