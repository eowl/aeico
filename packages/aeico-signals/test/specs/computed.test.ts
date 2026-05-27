import { expect } from '@esm-bundle/chai';
import { Signal } from '../../src/index.js';

describe('Signal.Computed', () => {
  describe('lazy evaluation', () => {
    it('callback is not called until get() is invoked', () => {
      let callCount = 0;
      new Signal.Computed(() => { callCount++; return 1; });
      expect(callCount).to.equal(0);
    });

    it('callback runs on first get()', () => {
      let callCount = 0;
      const c = new Signal.Computed(() => { callCount++; return 42; });
      expect(c.get()).to.equal(42);
      expect(callCount).to.equal(1);
    });

    it('callback is not re-run when deps have not changed', () => {
      let callCount = 0;
      const s = new Signal.State(1);
      const c = new Signal.Computed(() => { callCount++; return s.get() * 2; });
      c.get();
      c.get();
      c.get();
      expect(callCount).to.equal(1);
    });

    it('callback re-runs after a dependency changes', () => {
      let callCount = 0;
      const s = new Signal.State(1);
      const c = new Signal.Computed(() => { callCount++; return s.get() * 2; });
      expect(c.get()).to.equal(2);
      s.set(5);
      expect(c.get()).to.equal(10);
      expect(callCount).to.equal(2);
    });
  });

  describe('auto dependency tracking', () => {
    it('tracks multiple state dependencies', () => {
      const a = new Signal.State(1);
      const b = new Signal.State(2);
      const sum = new Signal.Computed(() => a.get() + b.get());
      expect(sum.get()).to.equal(3);
      a.set(10);
      expect(sum.get()).to.equal(12);
      b.set(20);
      expect(sum.get()).to.equal(30);
    });

    it('updates dependency set when conditional branches change', () => {
      const flag = new Signal.State(true);
      const a = new Signal.State(1);
      const b = new Signal.State(100);
      let callCount = 0;
      const c = new Signal.Computed(() => {
        callCount++;
        return flag.get() ? a.get() : b.get();
      });

      expect(c.get()).to.equal(1);
      a.set(2); // `a` is a dependency while flag === true
      expect(c.get()).to.equal(2);

      flag.set(false); // now depends on `b`, not `a`
      expect(c.get()).to.equal(100);

      // `a` should no longer be tracked — changing it must not re-run callback
      const callsAfterFlagChange = callCount;
      a.set(999);
      c.get(); // should be a cache hit
      expect(callCount).to.equal(callsAfterFlagChange);
    });

    it('handles chained Computeds', () => {
      const s = new Signal.State(2);
      const doubled = new Signal.Computed(() => s.get() * 2);
      const quadrupled = new Signal.Computed(() => doubled.get() * 2);

      expect(quadrupled.get()).to.equal(8);
      s.set(3);
      expect(quadrupled.get()).to.equal(12);
    });

    it('glitch-free: intermediate values are never observed', () => {
      const s = new Signal.State(1);
      const a = new Signal.Computed(() => s.get() + 1);
      const b = new Signal.Computed(() => s.get() + 1);
      const observed: number[] = [];
      const c = new Signal.Computed(() => {
        const val = a.get() + b.get();
        observed.push(val);
        return val;
      });

      expect(c.get()).to.equal(4); // (1+1) + (1+1)
      s.set(2);
      expect(c.get()).to.equal(6); // (2+1) + (2+1)
      // Each distinct value of `c` should only appear once — no glitchy
      // intermediate state where a was updated but b was not yet.
      for (const v of observed) {
        expect(v % 2).to.equal(0); // always even (a === b so sum is always even)
      }
    });
  });

  describe('memoization / caching', () => {
    it('does not recompute when a dep changes to the same value (custom equals)', () => {
      let evalCount = 0;
      const s = new Signal.State({ n: 1 }, { equals: (a, b) => a.n === b.n });
      const c = new Signal.Computed(() => { evalCount++; return s.get().n; });
      c.get();
      s.set({ n: 1 }); // logically same value
      c.get();
      expect(evalCount).to.equal(1);
    });

    it('downstream not re-computed when intermediate Computed value is unchanged', () => {
      const s = new Signal.State(1);
      const parity = new Signal.Computed(() => s.get() % 2 === 0 ? 'even' : 'odd');
      let leafCalls = 0;
      const leaf = new Signal.Computed(() => { leafCalls++; return parity.get(); });

      leaf.get(); // 'odd'
      s.set(3);   // still odd
      leaf.get();
      expect(leafCalls).to.equal(1); // leaf not re-evaluated, parity unchanged
    });
  });

  describe('error handling', () => {
    it('caches thrown errors', () => {
      const s = new Signal.State(0);
      const c = new Signal.Computed(() => {
        if (s.get() === 0) throw new Error('zero!');
        return s.get();
      });

      expect(() => c.get()).to.throw('zero!');
      expect(() => c.get()).to.throw('zero!'); // cached, not re-run
    });

    it('recovers when the dependency that caused the error changes', () => {
      const s = new Signal.State(0);
      const c = new Signal.Computed(() => {
        if (s.get() === 0) throw new Error('zero!');
        return s.get() * 2;
      });

      expect(() => c.get()).to.throw('zero!');
      s.set(5);
      expect(c.get()).to.equal(10);
    });

    it('re-throws the cached error on subsequent reads without re-evaluating', () => {
      let evalCount = 0;
      const s = new Signal.State(0);
      const c = new Signal.Computed(() => {
        evalCount++;
        if (s.get() === 0) throw new Error('boom');
        return s.get();
      });

      expect(() => c.get()).to.throw('boom');
      expect(() => c.get()).to.throw('boom');
      expect(evalCount).to.equal(1); // only evaluated once
    });
  });

  describe('cycle detection', () => {
    it('throws when a Computed reads itself', () => {
      let c: Signal.Computed<number>;
      c = new Signal.Computed(() => c.get() + 1);
      expect(() => c.get()).to.throw();
    });
  });

  describe('callback `this` binding', () => {
    it('callback is invoked with the Computed instance as `this`', () => {
      let capturedThis: unknown;
      const c = new Signal.Computed(function (this: unknown) {
        capturedThis = this;
        return 1;
      });
      c.get();
      expect(capturedThis).to.equal(c);
    });
  });

  describe('frozen guard', () => {
    it('get() throws inside a notify callback', () => {
      const s = new Signal.State(0);
      const c = new Signal.Computed(() => s.get());
      let thrown = false;
      const w = new Signal.subtle.Watcher(() => {
        try { c.get(); } catch { thrown = true; }
      });
      w.watch(c);
      c.get();
      s.set(1);
      expect(thrown).to.be.true;
      w.unwatch(c);
    });
  });
});
