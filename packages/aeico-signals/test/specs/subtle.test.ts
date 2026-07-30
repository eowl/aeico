import { expect } from '@esm-bundle/chai';
import { Signal } from '../../src/index.js';

describe('Signal.subtle', () => {
  describe('untrack()', () => {
    it('reads inside untrack() do not create dependencies', () => {
      const s = new Signal.State(1);
      let evalCount = 0;
      const c = new Signal.Computed(() => {
        evalCount++;
        return Signal.subtle.untrack(() => s.get());
      });

      expect(c.get()).to.equal(1);
      s.set(2);
      expect(c.get()).to.equal(1); // stale - dependency was not tracked
      expect(evalCount).to.equal(1); // callback not re-run
    });

    it('returns the callback return value', () => {
      const result = Signal.subtle.untrack(() => 42);
      expect(result).to.equal(42);
    });

    it('propagates exceptions from the callback', () => {
      expect(() => Signal.subtle.untrack(() => { throw new Error('oops'); })).to.throw('oops');
    });

    it('restores the tracking context even when callback throws', () => {
      const s = new Signal.State(10);
      let evalCount = 0;
      const c = new Signal.Computed(() => {
        evalCount++;
        try {
          Signal.subtle.untrack(() => { throw new Error('x'); });
        } catch {
          // ignore
        }
        return s.get(); // this read SHOULD be tracked
      });

      c.get();
      s.set(20);
      c.get();
      expect(evalCount).to.equal(2);
    });
  });

  describe('currentComputed()', () => {
    it('returns null outside a Computed evaluation', () => {
      expect(Signal.subtle.currentComputed()).to.be.null;
    });

    it('returns the currently-evaluating Computed inside its callback', () => {
      let captured: unknown = undefined;
      const c = new Signal.Computed(function (this: unknown) {
        captured = Signal.subtle.currentComputed();
        return 1;
      });
      c.get();
      expect(captured).to.equal(c);
    });

    it('returns the innermost Computed when nested', () => {
      let outerCapture: unknown;
      let innerCapture: unknown;

      const inner = new Signal.Computed(() => {
        innerCapture = Signal.subtle.currentComputed();
        return 1;
      });

      const outer = new Signal.Computed(() => {
        outerCapture = Signal.subtle.currentComputed();
        inner.get();
        return 2;
      });

      outer.get();
      expect(outerCapture).to.equal(outer);
      expect(innerCapture).to.equal(inner);
    });
  });

  describe('introspectSources()', () => {
    it('returns sources of a Computed after evaluation', () => {
      const s1 = new Signal.State(1);
      const s2 = new Signal.State(2);
      const c = new Signal.Computed(() => s1.get() + s2.get());
      c.get();
      const sources = Signal.subtle.introspectSources(c);
      expect(sources).to.include(s1);
      expect(sources).to.include(s2);
    });

    it('returns an empty array for an unevaluated Computed', () => {
      const _s = new Signal.State(1);
      const c = new Signal.Computed(() => _s.get());
      expect(Signal.subtle.introspectSources(c)).to.deep.equal([]);
    });

    it('returns watched signals for a Watcher', () => {
      const s = new Signal.State(0);
      const w = new Signal.subtle.Watcher(() => {});
      w.watch(s);
      expect(Signal.subtle.introspectSources(w)).to.include(s);
      w.unwatch(s);
    });
  });

  describe('introspectSinks()', () => {
    it('returns nothing for an unwatched State', () => {
      const s = new Signal.State(0);
      expect(Signal.subtle.introspectSinks(s)).to.deep.equal([]);
    });

    it('returns the Watcher when a State is directly watched', () => {
      const s = new Signal.State(0);
      const w = new Signal.subtle.Watcher(() => {});
      w.watch(s);
      expect(Signal.subtle.introspectSinks(s)).to.include(w);
      w.unwatch(s);
    });

    it('returns the watching Computed as a sink of its source State', () => {
      const s = new Signal.State(0);
      const c = new Signal.Computed(() => s.get());
      const w = new Signal.subtle.Watcher(() => {});
      w.watch(c);
      c.get(); // prime so c knows its sources
      expect(Signal.subtle.introspectSinks(s)).to.include(c);
      w.unwatch(c);
    });
  });

  describe('hasSinks()', () => {
    it('returns false for an unobserved signal', () => {
      const s = new Signal.State(0);
      expect(Signal.subtle.hasSinks(s)).to.be.false;
    });

    it('returns true while a Watcher is watching', () => {
      const s = new Signal.State(0);
      const w = new Signal.subtle.Watcher(() => {});
      w.watch(s);
      expect(Signal.subtle.hasSinks(s)).to.be.true;
      w.unwatch(s);
      expect(Signal.subtle.hasSinks(s)).to.be.false;
    });
  });

  describe('hasSources()', () => {
    it('returns false for an unevaluated Computed', () => {
      const _s = new Signal.State(0);
      const c = new Signal.Computed(() => _s.get());
      expect(Signal.subtle.hasSources(c)).to.be.false;
    });

    it('returns true after the Computed has been evaluated', () => {
      const s = new Signal.State(0);
      const c = new Signal.Computed(() => s.get());
      c.get();
      expect(Signal.subtle.hasSources(c)).to.be.true;
    });

    it('returns true for a Watcher with watched signals', () => {
      const s = new Signal.State(0);
      const w = new Signal.subtle.Watcher(() => {});
      w.watch(s);
      expect(Signal.subtle.hasSources(w)).to.be.true;
      w.unwatch(s);
    });

    it('returns false for an empty Watcher', () => {
      const w = new Signal.subtle.Watcher(() => {});
      expect(Signal.subtle.hasSources(w)).to.be.false;
    });
  });

  describe('watched / unwatched symbols', () => {
    it('the symbols are distinct', () => {
      expect(Signal.subtle.watched).to.not.equal(Signal.subtle.unwatched);
    });

    it('can be used as computed property keys in SignalOptions', () => {
      let watchedFired = false;
      let unwatchedFired = false;
      const s = new Signal.State(0, {
        [Signal.subtle.watched]() { watchedFired = true; },
        [Signal.subtle.unwatched]() { unwatchedFired = true; },
      });
      const w = new Signal.subtle.Watcher(() => {});
      w.watch(s);
      expect(watchedFired).to.be.true;
      w.unwatch(s);
      expect(unwatchedFired).to.be.true;
    });
  });
});
