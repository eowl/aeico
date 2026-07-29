import { expect } from '@esm-bundle/chai';
import { toKebab, SwapBuffer } from '../../src/utils.js';

describe('SwapBuffer', () => {
  it('current returns the initial active buffer', () => {
    const buf = new SwapBuffer(() => new Map<string, number>());
    expect(buf.current).to.be.instanceOf(Map);
  });

  it('swap() returns a snapshot containing written data', () => {
    const buf = new SwapBuffer(() => new Map<string, number>());
    buf.current.set('a', 1);
    buf.current.set('b', 2);

    const snapshot = buf.swap();

    expect(snapshot.get('a')).to.equal(1);
    expect(snapshot.get('b')).to.equal(2);
  });

  it('after swap(), current is a new empty buffer', () => {
    const buf = new SwapBuffer(() => new Map<string, number>());
    buf.current.set('a', 1);
    buf.swap();

    expect(buf.current.size).to.equal(0);
  });

  it('swap() does not allocate new objects - only 2 instances after two swaps', () => {
    const instances: Map<string, number>[] = [];
    const buf = new SwapBuffer(() => {
      const m = new Map<string, number>();
      instances.push(m);

      return m;
    });
    // Two instances are created during construction
    expect(instances.length).to.equal(2);

    buf.swap();
    buf.swap();
    buf.swap();

    // Multiple swaps do not create new instances
    expect(instances.length).to.equal(2);
  });

  it('after each swap(), current points to a different instance (rotating)', () => {
    const buf = new SwapBuffer(() => new Map<string, number>());
    const first = buf.current;

    buf.swap();
    const second = buf.current;
    expect(second).to.not.equal(first);

    buf.swap();
    const third = buf.current;
    expect(third).to.equal(first); // Rotates back to the first instance
  });

  it('the snapshot returned by swap() keeps its data until the next swap()', () => {
    const buf = new SwapBuffer(() => new Map<string, number>());
    buf.current.set('x', 42);
    const snapshot = buf.swap();

    // Before the next swap, the snapshot data remains intact
    buf.current.set('y', 99);
    expect(snapshot.get('x')).to.equal(42);
    expect(snapshot.has('y')).to.be.false;
  });

  it('the next swap() clears the previous snapshot', () => {
    const buf = new SwapBuffer(() => new Map<string, number>());
    buf.current.set('x', 42);
    const snapshot = buf.swap();

    // The second swap brings back the snapshot Map and clears it
    buf.swap();

    expect(snapshot.size).to.equal(0);
  });

  it('supports Set and other clearable objects', () => {
    const buf = new SwapBuffer(() => new Set<string>());
    buf.current.add('hello');
    const snapshot = buf.swap();

    expect(snapshot.has('hello')).to.be.true;
    expect(buf.current.size).to.equal(0);
  });

  it('snapshot is only valid until the next swap() - next swap will reuse and clear it', () => {
    const buf = new SwapBuffer(() => new Map<string, number>());

    buf.current.set('round', 1);
    const s1 = buf.swap(); // s1 = MapA {'round':1}, _active = MapB

    buf.current.set('round', 2);
    buf.swap();             // MapA is cleared and reused as new _active, s1 content disappears

    // After two rounds, s1's Map instance has been cleared and reused as the active buffer
    expect(s1.size).to.equal(0);
  });

  it('snapshots of adjacent rounds do not interfere (safe to read within the same round)', () => {
    const buf = new SwapBuffer(() => new Map<string, number>());

    buf.current.set('round', 1);
    const s1 = buf.swap();
    // s1 data is intact before the next swap
    expect(s1.get('round')).to.equal(1);

    buf.current.set('round', 2);
    const s2 = buf.swap();
    // s2 data is intact immediately after swap
    expect(s2.get('round')).to.equal(2);
  });
});

describe('toKebab()', () => {
  it('converts PascalCase to kebab-case', () => {
    expect(toKebab('MyComponent')).to.equal('my-component');
  });

  it('converts camelCase to kebab-case', () => {
    expect(toKebab('myComponent')).to.equal('my-component');
  });

  it('handles a single word (PascalCase)', () => {
    expect(toKebab('Button')).to.equal('button');
  });

  it('returns unchanged lowercase single word', () => {
    expect(toKebab('button')).to.equal('button');
  });

  it('handles multi-segment PascalCase', () => {
    expect(toKebab('AeicoButtonGroup')).to.equal('aeico-button-group');
  });

  it('strips leading underscores', () => {
    expect(toKebab('_MyComponent')).to.equal('my-component');
  });

  it('strips leading digits', () => {
    expect(toKebab('123MyEl')).to.equal('my-el');
  });

  it('handles adjacent uppercase letters', () => {
    // regex only breaks on lowercase-to-uppercase boundary, consecutive caps stay together
    expect(toKebab('AeicoUI')).to.equal('aeico-ui');
  });
});
