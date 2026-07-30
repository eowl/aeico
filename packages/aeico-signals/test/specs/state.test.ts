import { expect } from '@esm-bundle/chai';
import { Signal } from '../../src/index.js';

describe('Signal.State', () => {
  describe('basic get/set', () => {
    it('returns the initial value', () => {
      const s = new Signal.State(42);
      expect(s.get()).to.equal(42);
    });

    it('returns updated value after set()', () => {
      const s = new Signal.State(0);
      s.set(99);
      expect(s.get()).to.equal(99);
    });

    it('stores non-primitive values', () => {
      const obj = { x: 1 };
      const s = new Signal.State(obj);
      expect(s.get()).to.equal(obj);
    });

    it('set() with the same value (Object.is) does not trigger an update', () => {
      let notified = 0;
      const s = new Signal.State(1);
      const c = new Signal.Computed(() => { notified++; return s.get(); });
      c.get(); // prime
      s.set(1);
      c.get();
      expect(notified).to.equal(1); // callback ran once, not twice
    });

    it('set() with NaN to NaN is a no-op (Object.is(NaN, NaN) === true)', () => {
      let notified = 0;
      const s = new Signal.State(NaN);
      const c = new Signal.Computed(() => { notified++; return s.get(); });
      c.get();
      s.set(NaN);
      c.get();
      expect(notified).to.equal(1);
    });
  });

  describe('custom equals', () => {
    it('uses the supplied equals function', () => {
      let callCount = 0;
      const s = new Signal.State(
        { v: 1 },
        { equals(a, b) { callCount++; return a.v === b.v; } },
      );
      s.set({ v: 1 }); // same "logical" value
      expect(callCount).to.equal(1);
    });

    it('propagates when equals returns false', () => {
      const s = new Signal.State(
        { v: 1 },
        { equals(_a, _b) { return false; } }, // never equal
      );
      let reads = 0;
      const c = new Signal.Computed(() => { reads++; return s.get().v; });
      c.get();
      s.set({ v: 1 });
      c.get();
      expect(reads).to.equal(2);
    });

    it('called with the signal as `this`', () => {
      let capturedThis: unknown;
      const s = new Signal.State(0, {
        equals(a, b) {
          capturedThis = this;
          return Object.is(a, b);
        },
      });
      s.set(1);
      expect(capturedThis).to.equal(s);
    });
  });

  describe('watched / unwatched callbacks', () => {
    it('fires watched when a Watcher starts watching', () => {
      let fired = false;
      const s = new Signal.State(0, {
        [Signal.subtle.watched]() { fired = true; },
      });
      const w = new Signal.subtle.Watcher(() => {});
      w.watch(s);
      expect(fired).to.be.true;
      w.unwatch(s);
    });

    it('fires unwatched when the last Watcher stops watching', () => {
      let fired = false;
      const s = new Signal.State(0, {
        [Signal.subtle.unwatched]() { fired = true; },
      });
      const w = new Signal.subtle.Watcher(() => {});
      w.watch(s);
      w.unwatch(s);
      expect(fired).to.be.true;
    });

    it('does not fire unwatched until the last watcher is removed', () => {
      let unwatchedCount = 0;
      const s = new Signal.State(0, {
        [Signal.subtle.unwatched]() { unwatchedCount++; },
      });
      const w1 = new Signal.subtle.Watcher(() => {});
      const w2 = new Signal.subtle.Watcher(() => {});
      w1.watch(s);
      w2.watch(s);
      w1.unwatch(s);
      expect(unwatchedCount).to.equal(0); // w2 still watching
      w2.unwatch(s);
      expect(unwatchedCount).to.equal(1);
    });

    it('watched callback receives the signal as `this`', () => {
      let capturedThis: unknown;
      const s = new Signal.State(0, {
        [Signal.subtle.watched]() { capturedThis = this; },
      });
      const w = new Signal.subtle.Watcher(() => {});
      w.watch(s);
      expect(capturedThis).to.equal(s);
      w.unwatch(s);
    });
  });

  describe('frozen guard', () => {
    it('get() throws inside a notify callback', () => {
      const s = new Signal.State(0);
      let thrown = false;
      const w = new Signal.subtle.Watcher(() => {
        try { s.get(); } catch { thrown = true; }
      });
      w.watch(s);
      s.set(1);
      expect(thrown).to.be.true;
      w.unwatch(s);
    });

    it('set() throws inside a notify callback', () => {
      const s = new Signal.State(0);
      let thrown = false;
      const w = new Signal.subtle.Watcher(() => {
        try { s.set(99); } catch { thrown = true; }
      });
      w.watch(s);
      s.set(1);
      expect(thrown).to.be.true;
      w.unwatch(s);
    });
  });
});
