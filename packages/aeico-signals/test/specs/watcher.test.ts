import { expect } from '@esm-bundle/chai';
import { Signal } from '../../src/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * A minimal but correct effect implementation using Watcher + queueMicrotask.
 * Returns a dispose function.
 */
function effect(cb: () => void): () => void {
  let cleanup: (() => void) | undefined;
  const computed = new Signal.Computed(() => {
    cleanup?.();
    cleanup = cb() as unknown as (() => void) | undefined;
  });
  const watcher = new Signal.subtle.Watcher(() => {
    queueMicrotask(() => {
      for (const s of watcher.getPending()) s.get();
      watcher.watch(); // reset notified state
    });
  });
  watcher.watch(computed);
  computed.get();
  return () => {
    cleanup?.();
    watcher.unwatch(computed);
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Signal.subtle.Watcher', () => {
  describe('state machine', () => {
    it('starts in the waiting state', () => {
      const w = new Signal.subtle.Watcher(() => {});
      // No public state accessor; verify via indirect observable behaviour.
      // Calling watch() with no args while waiting should not throw.
      w.watch(); // allowed: resets notify state
    });

    it('transitions to watching after watch(signal)', () => {
      const s = new Signal.State(0);
      const w = new Signal.subtle.Watcher(() => {});
      w.watch(s);
      // After watching, getPending() should be queryable.
      expect(w.getPending()).to.deep.equal([]);
      w.unwatch(s);
    });
  });

  describe('notify callback', () => {
    it('is called when a watched State changes', () => {
      let notified = 0;
      const s = new Signal.State(0);
      const w = new Signal.subtle.Watcher(() => { notified++; });
      w.watch(s);
      s.set(1);
      expect(notified).to.equal(1);
      w.unwatch(s);
    });

    it('is called only once between watch() resets even if state changes multiple times', () => {
      let notified = 0;
      const s = new Signal.State(0);
      const w = new Signal.subtle.Watcher(() => { notified++; });
      w.watch(s);
      s.set(1);
      s.set(2); // already pending; notify not called again
      expect(notified).to.equal(1);
      w.unwatch(s);
    });

    it('fires again after watch() is called to re-arm', () => {
      let notified = 0;
      const s = new Signal.State(0);
      const w = new Signal.subtle.Watcher(() => { notified++; });
      w.watch(s);
      s.set(1);
      expect(notified).to.equal(1);
      w.watch(); // re-arm
      s.set(2);
      expect(notified).to.equal(2);
      w.unwatch(s);
    });

    it('is invoked with the Watcher as `this`', () => {
      let capturedThis: unknown;
      const s = new Signal.State(0);
      const w = new Signal.subtle.Watcher(function (this: unknown) { capturedThis = this; });
      w.watch(s);
      s.set(1);
      expect(capturedThis).to.equal(w);
      w.unwatch(s);
    });

    it('notify callback cannot read Signals (frozen)', () => {
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

    it('notify callback cannot write Signals (frozen)', () => {
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

    it('notify is called transitively through a Computed chain', () => {
      let notified = 0;
      const s = new Signal.State(0);
      const c = new Signal.Computed(() => s.get() * 2);
      const w = new Signal.subtle.Watcher(() => { notified++; });
      w.watch(c);
      c.get();
      s.set(1);
      expect(notified).to.equal(1);
      w.unwatch(c);
    });
  });

  describe('getPending()', () => {
    it('returns Computed signals that are dirty or checked', () => {
      const s = new Signal.State(0);
      const c = new Signal.Computed(() => s.get());
      const w = new Signal.subtle.Watcher(() => {});
      w.watch(c);
      c.get();
      s.set(1);
      const pending = w.getPending();
      expect(pending).to.include(c);
      w.unwatch(c);
    });

    it('returns empty array when nothing is pending', () => {
      const s = new Signal.State(0);
      const c = new Signal.Computed(() => s.get());
      const w = new Signal.subtle.Watcher(() => {});
      w.watch(c);
      c.get();
      expect(w.getPending()).to.deep.equal([]);
      w.unwatch(c);
    });

    it('does not include State signals', () => {
      const s = new Signal.State(0);
      const w = new Signal.subtle.Watcher(() => {});
      w.watch(s);
      s.set(1);
      expect(w.getPending()).to.deep.equal([]);
      w.unwatch(s);
    });
  });

  describe('unwatch()', () => {
    it('stops receiving notifications after unwatch()', () => {
      let notified = 0;
      const s = new Signal.State(0);
      const w = new Signal.subtle.Watcher(() => { notified++; });
      w.watch(s);
      s.set(1);
      w.unwatch(s);
      s.set(2);
      expect(notified).to.equal(1);
    });

    it('throws when unwatching a signal that is not being watched', () => {
      const s = new Signal.State(0);
      const w = new Signal.subtle.Watcher(() => {});
      expect(() => w.unwatch(s)).to.throw();
    });
  });

  describe('watch() guards', () => {
    it('throws when called inside a notify callback', () => {
      const s = new Signal.State(0);
      let thrown = false;
      const w = new Signal.subtle.Watcher(() => {
        try { w.watch(); } catch { thrown = true; }
      });
      w.watch(s);
      s.set(1);
      expect(thrown).to.be.true;
      w.unwatch(s);
    });

    it('throws when passed a non-signal argument', () => {
      const w = new Signal.subtle.Watcher(() => {});
      expect(() => (w as unknown as { watch: (x: unknown) => void }).watch(42)).to.throw();
    });
  });

  describe('effect integration', () => {
    it('effect runs immediately on creation', async () => {
      const s = new Signal.State(0);
      let lastSeen = -1;
      const dispose = effect(() => { lastSeen = s.get(); });
      expect(lastSeen).to.equal(0);
      dispose();
    });

    it('effect re-runs asynchronously when a dependency changes', async () => {
      const s = new Signal.State(0);
      const results: number[] = [];
      const dispose = effect(() => { results.push(s.get()); });
      s.set(1);
      await new Promise(r => queueMicrotask(r as () => void));
      expect(results).to.include(1);
      dispose();
    });
  });
});
