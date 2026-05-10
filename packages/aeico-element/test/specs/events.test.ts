import { expect } from '@esm-bundle/chai';
import { emit, listenEvent, cleanupListeners, ListenerRegistry } from '../../src/events.js';

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

  it('add() supports AddEventListenerOptions (capture)', () => {
    const parent = document.createElement('div');
    const child = document.createElement('span');
    parent.appendChild(child);
    document.body.appendChild(parent);

    const registry = new ListenerRegistry();
    let captureCount = 0;
    registry.add(parent, 'click', () => { captureCount++; }, { capture: true });

    child.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(captureCount).to.equal(1);

    registry.removeAll();
    child.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(captureCount).to.equal(1);

    document.body.removeChild(parent);
  });
});

describe('listen() standalone function', () => {
  it('listen(host, event, handler) listens on the host element', () => {
    const host = document.createElement('div');
    let fired = false;
    listenEvent(host, 'click', () => { fired = true; });

    host.dispatchEvent(new MouseEvent('click'));
    expect(fired).to.be.true;
  });

  it('listen(host, target, event, handler) listens on an external target', () => {
    const host = document.createElement('div');
    const external = document.createElement('button');
    let fired = false;
    listenEvent(host, external, 'click', () => { fired = true; });

    external.dispatchEvent(new MouseEvent('click'));
    expect(fired).to.be.true;
  });

  it('listen(host, event, handler, options) passes options to addEventListener', () => {
    const parent = document.createElement('div');
    const child = document.createElement('span');
    parent.appendChild(child);
    document.body.appendChild(parent);

    const host = {};
    let captureCount = 0;
    listenEvent(host, parent, 'click', () => { captureCount++; }, { capture: true });

    child.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(captureCount).to.equal(1);

    document.body.removeChild(parent);
  });

  it('multiple hosts track their listeners independently', () => {
    const hostA = {};
    const hostB = {};
    const el = document.createElement('div');
    let countA = 0;
    let countB = 0;

    listenEvent(hostA, el, 'click', () => { countA++; });
    listenEvent(hostB, el, 'click', () => { countB++; });

    el.dispatchEvent(new MouseEvent('click'));
    expect(countA).to.equal(1);
    expect(countB).to.equal(1);

    cleanupListeners(hostA);
    el.dispatchEvent(new MouseEvent('click'));
    expect(countA).to.equal(1);
    expect(countB).to.equal(2);
  });
});

describe('cleanupListeners()', () => {
  it('removes all listeners registered for the host', () => {
    const host = {};
    const el = document.createElement('div');
    let count = 0;
    listenEvent(host, el, 'click', () => { count++; });
    listenEvent(host, el, 'click', () => { count++; });

    el.dispatchEvent(new MouseEvent('click'));
    expect(count).to.equal(2);

    cleanupListeners(host);
    el.dispatchEvent(new MouseEvent('click'));
    expect(count).to.equal(2);
  });

  it('removes capture listeners correctly', () => {
    const host = {};
    const parent = document.createElement('div');
    const child = document.createElement('span');
    parent.appendChild(child);
    document.body.appendChild(parent);

    let count = 0;
    listenEvent(host, parent, 'click', () => { count++; }, { capture: true });

    child.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(count).to.equal(1);

    cleanupListeners(host);
    child.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(count).to.equal(1);

    document.body.removeChild(parent);
  });

  it('calling cleanupListeners twice does not throw', () => {
    const host = {};
    const el = document.createElement('div');
    listenEvent(host, el, 'click', () => {});
    cleanupListeners(host);

    expect(() => cleanupListeners(host)).to.not.throw();
  });
});
