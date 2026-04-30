import { expect } from '@esm-bundle/chai';
import { emit, ListenerRegistry } from '../../src/events.js';

describe('emit()', () => {
  it('dispatches a CustomEvent on the target', () => {
    const el = document.createElement('div');
    let received: CustomEvent | null = null;
    el.addEventListener('my-event', (e) => {
      received = e as CustomEvent;
    });

    emit(el, 'my-event');

    expect(received).to.not.be.null;
  });

  it('event bubbles by default', () => {
    const parent = document.createElement('div');
    const child = document.createElement('span');
    parent.appendChild(child);
    document.body.appendChild(parent);

    let bubbled = false;
    parent.addEventListener('bubble-test', () => {
      bubbled = true;
    });
    emit(child, 'bubble-test');

    expect(bubbled).to.be.true;
    document.body.removeChild(parent);
  });

  it('event is composed by default', () => {
    const el = document.createElement('div');
    let ev: unknown = null;
    el.addEventListener('composed-test', (e) => {
      ev = e;
    });
    emit(el, 'composed-test');

    expect((ev as CustomEvent).composed).to.be.true;
  });

  it('attaches detail payload to the event', () => {
    const el = document.createElement('div');
    let detail: unknown = null;
    el.addEventListener('detail-event', (e) => {
      detail = (e as CustomEvent).detail;
    });

    emit(el, 'detail-event', { detail: { value: 42 } });

    expect(detail).to.deep.equal({ value: 42 });
  });

  it('bubbles=false prevents event from bubbling', () => {
    const parent = document.createElement('div');
    const child = document.createElement('span');
    parent.appendChild(child);
    document.body.appendChild(parent);

    let bubbled = false;
    parent.addEventListener('no-bubble', () => {
      bubbled = true;
    });
    emit(child, 'no-bubble', { bubbles: false });

    expect(bubbled).to.be.false;
    document.body.removeChild(parent);
  });

  it('composed=false prevents event from crossing shadow DOM boundary', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const inner = document.createElement('span');
    shadow.appendChild(inner);

    let crossed = false;
    host.addEventListener('shadow-event', () => {
      crossed = true;
    });
    emit(inner, 'shadow-event', { bubbles: true, composed: false });

    expect(crossed).to.be.false;
    document.body.removeChild(host);
  });
});

describe('ListenerRegistry', () => {
  it('adds an event listener to a target', () => {
    const el = document.createElement('div');
    const registry = new ListenerRegistry();
    let fired = false;
    registry.add(el, 'click', () => {
      fired = true;
    });

    el.dispatchEvent(new MouseEvent('click'));

    expect(fired).to.be.true;
  });

  it('removeAll() removes all registered listeners', () => {
    const el = document.createElement('div');
    const registry = new ListenerRegistry();
    let count = 0;
    registry.add(el, 'click', () => {
      count++;
    });
    registry.add(el, 'click', () => {
      count++;
    });

    el.dispatchEvent(new MouseEvent('click'));
    expect(count).to.equal(2);

    registry.removeAll();
    el.dispatchEvent(new MouseEvent('click'));
    expect(count).to.equal(2); // no new firings after removal
  });

  it('calling removeAll() twice does not throw', () => {
    const el = document.createElement('div');
    const registry = new ListenerRegistry();
    registry.add(el, 'click', () => {});
    registry.removeAll();

    expect(() => registry.removeAll()).to.not.throw();
  });

  it('supports listeners on multiple targets', () => {
    const a = document.createElement('div');
    const b = document.createElement('div');
    const registry = new ListenerRegistry();
    let count = 0;
    registry.add(a, 'click', () => {
      count++;
    });
    registry.add(b, 'click', () => {
      count++;
    });

    a.dispatchEvent(new MouseEvent('click'));
    b.dispatchEvent(new MouseEvent('click'));
    expect(count).to.equal(2);

    registry.removeAll();
    a.dispatchEvent(new MouseEvent('click'));
    b.dispatchEvent(new MouseEvent('click'));
    expect(count).to.equal(2);
  });
});
