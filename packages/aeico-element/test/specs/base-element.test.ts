import { expect } from '@esm-bundle/chai';
import { mount, unmountAll, updated } from '../helpers/mount.js';
import BaseElement from '../../src/base-element.js';
import { html, render as applyRender, getReconciler } from 'aeico-view';
import type { Props } from '../../src/types.js';

afterEach(() => {
  unmountAll();
});

let _counter = 0;

function createTestElement(Base = BaseElement) {
  const tag = `test-build-el-${++_counter}`;
  const El = class extends Base {
    get testContainer() {
      return this.container;
    }
  };

  customElements.define(tag, El);

  return { tag, El };
}

function defineEl(props: Props, setup?: (El: typeof BaseElement) => void): string {
  const tag = `test-el-${++_counter}`;

  class El extends BaseElement {
    static props = props;
  }

  setup?.(El);
  customElements.define(tag, El);

  return tag;
}

describe('BaseElement', () => {
  it('should have a static props object', () => {
    expect(BaseElement).to.have.property('props');
    expect(BaseElement.props).to.be.an('object');
  });

  describe('html() and render()', () => {
    it('render template to shadowRoot via html() + render()', async () => {
      const { tag } = createTestElement();
      const el = await mount<InstanceType<ReturnType<typeof createTestElement>['El']>>(
        `<${tag}></${tag}>`,
      );

      const tpl = html(({ div }) => {
        div({ textContent: 'hello' });
      });
      applyRender(tpl, el.shadowRoot!);

      expect(el.shadowRoot!.querySelector('div')).to.exist;
      expect(el.shadowRoot!.querySelector('div')!.textContent).to.equal('hello');
    });

    it('multiple render calls reuse DOM nodes through diffing, only updating content', async () => {
      const { tag } = createTestElement();
      const el = await mount<InstanceType<ReturnType<typeof createTestElement>['El']>>(
        `<${tag}></${tag}>`,
      );

      applyRender(
        html(({ div }) => {
          div({ className: 'box', textContent: 'first' });
        }),
        el.shadowRoot!,
      );
      const firstNode = el.shadowRoot!.querySelector('.box');

      applyRender(
        html(({ div }) => {
          div({ className: 'box', textContent: 'second' });
        }),
        el.shadowRoot!,
      );
      const secondNode = el.shadowRoot!.querySelector('.box');

      expect(firstNode).to.equal(secondNode);
      expect(secondNode!.textContent).to.equal('second');
    });

    it('useShadowDOM=false', async () => {
      const tag = `test-no-shadow-${++_counter}`;
      class NoShadowEl extends BaseElement {
        static useShadowDOM = false;
      }
      customElements.define(tag, NoShadowEl);

      const el = await mount<NoShadowEl>(`<${tag}></${tag}>`);

      applyRender(
        html(({ p }) => {
          p({ textContent: 'light dom' });
        }),
        el,
      );

      expect(el.shadowRoot).to.be.null;
      expect(el.querySelector('p')!.textContent).to.equal('light dom');
    });

    it('render() in component returns html() result, shadowRoot has content after first render', async () => {
      const tag = `test-auto-render-${++_counter}`;
      class AutoRenderEl extends BaseElement {
        protected render() {
          return html(({ span }) => {
            span({ textContent: 'auto' });
          });
        }
      }
      customElements.define(tag, AutoRenderEl);

      const el = await mount<AutoRenderEl>(`<${tag}></${tag}>`);
      await updated();

      expect(el.shadowRoot!.querySelector('span')!.textContent).to.equal('auto');
    });

    it('getReconciler() works inside render context', async () => {
      const tag = `test-active-builder-${++_counter}`;
      let reconcilerInside: unknown = null;
      class TestEl extends BaseElement {
        protected render() {
          return html((reconciler) => {
            reconcilerInside = getReconciler();
            expect(reconcilerInside).to.equal(reconciler);
            reconciler.div({ textContent: 'ok' });
          });
        }
      }
      customElements.define(tag, TestEl);

      await mount<TestEl>(`<${tag}></${tag}>`);
      await updated();

      expect(reconcilerInside).to.not.be.null;
    });

    it('getReconciler() throws outside render context', () => {
      expect(() => getReconciler()).to.throw('outside of a render() context');
    });
  });

  describe('Props Handler', () => {
    describe('attribute reflection and observation', () => {
      it('property changes reflect to attribute by default', async () => {
        const tag = defineEl({ title: { type: String } });
        const el = await mount<BaseElement & { title: string }>(`<${tag}></${tag}>`);
        el.title = 'Hello World';
        expect(el.getAttribute('title')).to.equal('Hello World');
      });

      it('attribute changes reflect to property by default', async () => {
        const tag = defineEl({ name: { type: String } });
        const el = await mount<BaseElement & { name: string }>(`<${tag} name="Alice"></${tag}>`);
        expect(el.name).to.equal('Alice');
      });

      it('setting property does not reflect to attribute when reflect is false', async () => {
        const tag = defineEl({ count: { type: Number, reflect: false } });
        const el = await mount<BaseElement & { count: number }>(`<${tag}></${tag}>`);
        el.count = 10;
        expect(el.getAttribute('count')).to.be.null;
      });

      it('changing attribute does not update property when observe is false', async () => {
        const tag = defineEl({ active: { type: Boolean, observe: false } });
        const el = await mount<BaseElement & { active: boolean }>(`<${tag} active></${tag}>`);
        el.setAttribute('active', '');
        await updated();
        expect(el.active).to.be.undefined;
      });

      it('custom attribute name via attr option', async () => {
        const tag = defineEl({ score: { type: Number, attr: 'data-score' } });
        const el = await mount<BaseElement & { score: number }>(
          `<${tag} data-score="42"></${tag}>`,
        );
        expect(el.score).to.equal(42);
      });

      it('external setAttribute syncs to property immediately', async () => {
        const tag = defineEl({ count: { type: Number } });
        const el = await mount<BaseElement & { count: number }>(`<${tag} count="1"></${tag}>`);
        expect(el.count).to.equal(1);

        el.setAttribute('count', '99');
        await updated();
        expect(el.count).to.equal(99);
      });

      it('external removeAttribute resets Boolean prop to false', async () => {
        const tag = defineEl({ active: { type: Boolean } });
        const el = await mount<BaseElement & { active: boolean }>(`<${tag} active></${tag}>`);
        expect(el.active).to.be.true;

        el.removeAttribute('active');
        await updated();
        expect(el.active).to.be.false;
      });

      it('external removeAttribute resets non-Boolean prop to undefined', async () => {
        const tag = defineEl({ label: { type: String } });
        const el = await mount<BaseElement & { label: string | undefined }>(
          `<${tag} label="hello"></${tag}>`,
        );
        expect(el.label).to.equal('hello');

        el.removeAttribute('label');
        await updated();
        expect(el.label).to.be.undefined;
      });

      it('HTML parser preset attribute is readable before first JS interaction', async () => {
        const tag = defineEl({ count: { type: Number } });
        const el = await mount<BaseElement & { count: number }>(`<${tag} count="7"></${tag}>`);
        // No JS setter was called — value must come from attributeChangedCallback initialisation.
        expect(el.count).to.equal(7);
      });

      it('observe:false prop ignores external setAttribute', async () => {
        const tag = defineEl({ active: { type: Boolean, observe: false } });
        const el = await mount<BaseElement & { active: boolean }>(`<${tag}></${tag}>`);
        el.setAttribute('active', '');
        await updated();
        // observe:false — attributeChangedCallback is never called, internalKey stays undefined.
        expect(el.active).to.be.undefined;
      });

      it('Array prop deserialized value is stored in internalKey, not re-parsed on re-read', async () => {
        let parseCount = 0;
        const tag = defineEl({
          items: {
            type: Array,
            parser: (v: string | null) => {
              if (v !== null) parseCount++;
              return v ? JSON.parse(v) : [];
            },
          },
        });
        const el = await mount<BaseElement & { items: number[] }>(
          `<${tag} items="[1,2,3]"></${tag}>`,
        );
        // Read the property three times
        void el.items;
        void el.items;
        void el.items;
        // Parser is invoked once (during attributeChangedCallback), never during getter reads.
        expect(parseCount).to.equal(1);
        expect(el.items).to.deep.equal([1, 2, 3]);
      });

      it('reactive accessor lives on the prototype, not the instance', async () => {
        const tag = defineEl({ count: { type: Number } });
        const el = await mount<BaseElement & { count: number }>(`<${tag}></${tag}>`);
        // The own property should not be an accessor — the instance stores only the backing field.
        expect(Object.getOwnPropertyDescriptor(el, 'count')).to.be.undefined;
        // The prototype carries the shared accessor.
        const proto = Object.getPrototypeOf(el);
        const descriptor = Object.getOwnPropertyDescriptor(proto, 'count');
        expect(descriptor).to.exist;
        expect(descriptor!.get).to.be.a('function');
        expect(descriptor!.set).to.be.a('function');
      });

      it('all instances of the same class share the identical accessor functions', async () => {
        const tag = defineEl({ value: { type: String } });
        const el1 = await mount<BaseElement & { value: string }>(`<${tag}></${tag}>`);
        const el2 = await mount<BaseElement & { value: string }>(`<${tag}></${tag}>`);
        const proto = Object.getPrototypeOf(el1);
        const d1 = Object.getOwnPropertyDescriptor(proto, 'value')!;
        const d2 = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el2), 'value')!;
        // Same prototype → identical function references.
        expect(d1.get).to.equal(d2.get);
        expect(d1.set).to.equal(d2.set);
      });
    });

    describe('custom parser and formatter', () => {
      it('parser transforms attribute string into a custom value when property is read', async () => {
        const tag = defineEl({
          score: { parser: (v: string | null) => (v ? parseInt(v) * 2 : 0) },
        });
        const el = await mount<BaseElement & { score: number }>(`<${tag} score="21"></${tag}>`);
        expect(el.score).to.equal(42);
      });

      it('parser receives null when the attribute is removed', async () => {
        const received: (string | null)[] = [];
        const tag = defineEl({
          val: {
            parser: (v: string | null) => {
              received.push(v);
              return v ?? 'default';
            },
          },
        });
        const el = await mount<BaseElement & { val: string }>(`<${tag} val="hello"></${tag}>`);
        el.removeAttribute('val');
        await updated();

        expect(received).to.include(null);
        expect(el.val).to.equal('default');
      });

      it('parser receives the declared type as its second argument', async () => {
        let capturedType: unknown;
        const tag = defineEl({
          count: {
            type: Number,
            parser: (v: string | null, type?: unknown) => {
              capturedType = type;
              return v ? Number(v) : 0;
            },
          },
        });
        await mount(`<${tag} count="5"></${tag}>`);
        expect(capturedType).to.equal(Number);
      });

      it('formatter serializes property value to attribute string when property is set', async () => {
        const tag = defineEl({ names: { formatter: (v: unknown) => (v as string[]).join(',') } });
        const el = await mount<BaseElement & { names: string[] }>(`<${tag}></${tag}>`);
        el.names = ['a', 'b', 'c'];
        expect(el.getAttribute('names')).to.equal('a,b,c');
      });

      it('formatter receives the declared type as its second argument', async () => {
        let capturedType: unknown;
        const tag = defineEl({
          active: {
            type: Boolean,
            formatter: (v: unknown, type?: unknown) => {
              capturedType = type;
              return (v as boolean) ? 'yes' : 'no';
            },
          },
        });
        const el = await mount<BaseElement & { active: boolean }>(`<${tag}></${tag}>`);
        el.active = true;
        expect(capturedType).to.equal(Boolean);
        expect(el.getAttribute('active')).to.equal('yes');
      });

      it('formatter returning null sets the attribute to an empty string', async () => {
        const tag = defineEl({ mood: { formatter: (_v: unknown) => null } });
        const el = await mount<BaseElement & { mood: string }>(`<${tag}></${tag}>`);
        el.mood = 'happy';
        expect(el.getAttribute('mood')).to.equal('');
      });

      it('parser and formatter roundtrip: set property formatter writes attribute parser reads it back', async () => {
        const tag = defineEl({
          items: {
            formatter: (v: unknown) => (v as number[]).join(';'),
            parser: (v: string | null) => (v ? v.split(';').map(Number) : []),
          },
        });
        const el = await mount<BaseElement & { items: number[] }>(`<${tag}></${tag}>`);
        el.items = [1, 2, 3];
        expect(el.getAttribute('items')).to.equal('1;2;3');
        expect(el.items).to.deep.equal([1, 2, 3]);
      });
    });

    describe('update() call count with reflection', () => {
      it('setting a reflected property calls update() twice but executeUpdate() only once', async () => {
        const tag = `test-update-count-${++_counter}`;
        let updateCallCount = 0;
        let renderCallCount = 0;

        class TrackingEl extends BaseElement {
          static props: Props = { value: { type: String } };
          declare value: string;

          update(name?: string, oldValue?: unknown) {
            updateCallCount++;
            super.update(name, oldValue);
          }

          protected render() {
            renderCallCount++;
          }
        }
        customElements.define(tag, TrackingEl);

        const el = await mount<TrackingEl>(`<${tag}></${tag}>`);
        await updated();

        // Reset counters after initial mount
        updateCallCount = 0;
        renderCallCount = 0;

        el.value = 'hello';
        await updated();

        // setter calls update() once; _reflecting flag prevents attributeChangedCallback from calling it again
        expect(updateCallCount).to.equal(1);
        // but _updatePending flag ensures executeUpdate runs only once
        expect(renderCallCount).to.equal(1);
      });

      it('setting a non-reflected property calls update() exactly once', async () => {
        const tag = `test-update-count-noreflect-${++_counter}`;
        let updateCallCount = 0;
        let renderCallCount = 0;

        class TrackingEl extends BaseElement {
          static props: Props = { value: { type: String, reflect: false } };
          declare value: string;

          update(name?: string, oldValue?: unknown) {
            updateCallCount++;
            super.update(name, oldValue);
          }

          protected render() {
            renderCallCount++;
          }
        }
        customElements.define(tag, TrackingEl);

        const el = await mount<TrackingEl>(`<${tag}></${tag}>`);
        await updated();

        updateCallCount = 0;
        renderCallCount = 0;

        el.value = 'hello';
        await updated();

        // No reflection no attributeChangedCallback update() called only once
        expect(updateCallCount).to.equal(1);
        expect(renderCallCount).to.equal(1);
      });
    });
  });

  describe('type deserialization (deserializeAttribute)', () => {
    it('Boolean: attribute present without value true', async () => {
      const tag = defineEl({ active: { type: Boolean } });
      const el = await mount<BaseElement & { active: boolean }>(`<${tag} active></${tag}>`);
      expect(el.active).to.be.true;
    });

    it('Boolean: attribute = "false" false', async () => {
      const tag = defineEl({ active: { type: Boolean } });
      const el = await mount<BaseElement & { active: boolean }>(`<${tag} active="false"></${tag}>`);
      expect(el.active).to.be.false;
    });

    it('Boolean: attribute removed (null) false', async () => {
      const tag = defineEl({ active: { type: Boolean } });
      const el = await mount<BaseElement & { active: boolean }>(`<${tag} active></${tag}>`);
      el.removeAttribute('active');
      await updated();
      expect(el.active).to.be.false;
    });

    it('Number: empty string attribute 0', async () => {
      const tag = defineEl({ count: { type: Number } });
      const el = await mount<BaseElement & { count: number }>(`<${tag} count=""></${tag}>`);
      expect(el.count).to.equal(0);
    });

    it('Number: numeric string parsed number', async () => {
      const tag = defineEl({ count: { type: Number } });
      const el = await mount<BaseElement & { count: number }>(`<${tag} count="7"></${tag}>`);
      expect(el.count).to.equal(7);
    });

    it('Array: valid JSON parsed array', async () => {
      const tag = defineEl({ items: { type: Array } });
      const el = await mount<BaseElement & { items: number[] }>(
        `<${tag} items="[1,2,3]"></${tag}>`,
      );
      expect(el.items).to.deep.equal([1, 2, 3]);
    });

    it('Array: invalid JSON empty array []', async () => {
      const tag = defineEl({ items: { type: Array } });
      const el = await mount<BaseElement & { items: unknown[] }>(
        `<${tag} items="not-json"></${tag}>`,
      );
      expect(el.items).to.deep.equal([]);
    });

    it('Object: valid JSON parsed object', async () => {
      const tag = defineEl({ data: { type: Object } });
      const el = await mount<BaseElement & { data: Record<string, unknown> }>(
        `<${tag} data='{"key":"val"}'></${tag}>`,
      );
      expect(el.data).to.deep.equal({ key: 'val' });
    });

    it('Object: invalid JSON empty object {}', async () => {
      const tag = defineEl({ data: { type: Object } });
      const el = await mount<BaseElement & { data: Record<string, unknown> }>(
        `<${tag} data="not-json"></${tag}>`,
      );
      expect(el.data).to.deep.equal({});
    });
  });

  describe('type serialization (serializeAttribute / attribute reflection)', () => {
    it('Boolean true reflects attribute "true"', async () => {
      const tag = defineEl({ active: { type: Boolean } });
      const el = await mount<BaseElement & { active: boolean }>(`<${tag}></${tag}>`);
      el.active = true;
      expect(el.getAttribute('active')).to.equal('true');
    });

    it('Boolean false removes attribute', async () => {
      const tag = defineEl({ active: { type: Boolean } });
      const el = await mount<BaseElement & { active: boolean }>(`<${tag} active="true"></${tag}>`);
      el.active = false;
      expect(el.hasAttribute('active')).to.be.false;
    });

    it('null value removes attribute', async () => {
      const tag = defineEl({ title: { type: String } });
      const el = await mount<BaseElement & { title: string | null }>(
        `<${tag} title="hello"></${tag}>`,
      );
      (el as any).title = null;
      expect(el.hasAttribute('title')).to.be.false;
    });

    it('undefined value removes attribute', async () => {
      const tag = defineEl({ title: { type: String } });
      const el = await mount<BaseElement & { title: string | undefined }>(
        `<${tag} title="hello"></${tag}>`,
      );
      (el as any).title = undefined;
      expect(el.hasAttribute('title')).to.be.false;
    });

    it('Number reflects as string', async () => {
      const tag = defineEl({ count: { type: Number } });
      const el = await mount<BaseElement & { count: number }>(`<${tag}></${tag}>`);
      el.count = 42;
      expect(el.getAttribute('count')).to.equal('42');
    });

    it('Array reflects as JSON string', async () => {
      const tag = defineEl({ items: { type: Array } });
      const el = await mount<BaseElement & { items: number[] }>(`<${tag}></${tag}>`);
      el.items = [1, 2, 3];
      expect(el.getAttribute('items')).to.equal('[1,2,3]');
    });

    it('Object reflects as JSON string', async () => {
      const tag = defineEl({ config: { type: Object } });
      const el = await mount<BaseElement & { config: Record<string, unknown> }>(
        `<${tag}></${tag}>`,
      );
      el.config = { a: 1 };
      expect(el.getAttribute('config')).to.equal('{"a":1}');
    });
  });

  describe('lifecycle hooks', () => {
    it('onPrepare returning false skips render', async () => {
      const tag = `test-lifecycle-prepare-${++_counter}`;
      let renderCount = 0;

      class El extends BaseElement {
        static props: Props = { value: { type: String } };
        declare value: string;

        protected onPrepare() {
          return false;
        }

        protected render() {
          renderCount++;
        }
      }
      customElements.define(tag, El);

      const el = await mount<El>(`<${tag}></${tag}>`);
      await updated();
      renderCount = 0;

      el.value = 'hello';
      await updated();

      expect(renderCount).to.equal(0);
    });

    it('onUpdated is called after render with changedProps', async () => {
      const tag = `test-lifecycle-updated-${++_counter}`;
      const log: string[] = [];

      class El extends BaseElement {
        static props: Props = { label: { type: String } };
        declare label: string;

        protected render() {
          log.push('render');
        }

        protected onUpdated(changedProps: Map<string, unknown>) {
          log.push(`updated:${[...changedProps.keys()].join(',')}`);
        }
      }
      customElements.define(tag, El);

      const el = await mount<El>(`<${tag}></${tag}>`);
      await updated();
      log.length = 0;

      el.label = 'test';
      await updated();

      expect(log).to.deep.equal(['render', 'updated:label']);
    });

    it('onMounted is called only after first render', async () => {
      const tag = `test-lifecycle-mounted-${++_counter}`;
      let mountedCount = 0;

      class El extends BaseElement {
        static props: Props = { value: { type: String } };
        declare value: string;

        protected onMounted() {
          mountedCount++;
        }
      }
      customElements.define(tag, El);

      const el = await mount<El>(`<${tag}></${tag}>`);
      await updated();

      expect(mountedCount).to.equal(1);

      el.value = 'changed';
      await updated();

      expect(mountedCount).to.equal(1);
    });

    it('changedProps passed to onPrepare contains changed property names', async () => {
      const tag = `test-lifecycle-changedprops-${++_counter}`;
      let captured!: string[];

      class El extends BaseElement {
        static props: Props = { a: { type: String }, b: { type: Number } };
        declare a: string;
        declare b: number;

        protected onPrepare(changedProps: Map<string, unknown>) {
          captured = [...changedProps.keys()];
        }
      }
      customElements.define(tag, El);

      const el = await mount<El>(`<${tag}></${tag}>`);
      await updated();
      captured = [];

      el.a = 'hello';
      el.b = 42;
      await updated();

      expect(captured).to.include('a');
      expect(captured).to.include('b');
    });
  });

  describe('listen() and disconnectedCallback', () => {
    it('listen(event, handler) adds listener on the element', async () => {
      const tag = `test-listen-self-${++_counter}`;
      let fired = false;

      class El extends BaseElement {
        protected onMounted() {
          this.listen('custom-event', () => {
            fired = true;
          });
        }
      }
      customElements.define(tag, El);

      const el = await mount<El>(`<${tag}></${tag}>`);
      await updated();

      el.dispatchEvent(new CustomEvent('custom-event'));
      expect(fired).to.be.true;
    });

    it('listen(target, event, handler) adds listener on external target', async () => {
      const tag = `test-listen-target-${++_counter}`;
      let fired = false;
      const externalTarget = document.createElement('div');

      class El extends BaseElement {
        protected onMounted() {
          this.listen(externalTarget, 'click', () => {
            fired = true;
          });
        }
      }
      customElements.define(tag, El);

      await mount<El>(`<${tag}></${tag}>`);
      await updated();

      externalTarget.dispatchEvent(new MouseEvent('click'));
      expect(fired).to.be.true;
    });

    it('disconnectedCallback removes all tracked listeners', async () => {
      const tag = `test-listen-cleanup-${++_counter}`;
      let fireCount = 0;

      class El extends BaseElement {
        protected onMounted() {
          this.listen('my-event', () => {
            fireCount++;
          });
        }
      }
      customElements.define(tag, El);

      const el = await mount<El>(`<${tag}></${tag}>`);
      await updated();

      el.dispatchEvent(new CustomEvent('my-event'));
      expect(fireCount).to.equal(1);

      // disconnect
      el.parentElement!.removeChild(el);

      el.dispatchEvent(new CustomEvent('my-event'));
      expect(fireCount).to.equal(1); // listener should be gone
    });
  });

  describe('emit()', () => {
    it('dispatches a custom event on the element', async () => {
      const tag = `test-emit-basic-${++_counter}`;
      let received: CustomEvent | null = null;

      class El extends BaseElement {
        static props: Props = { active: { type: Boolean } };
        declare active: boolean;

        protected onUpdated() {
          if (this.active) this.emit('my-action');
        }
      }
      customElements.define(tag, El);

      const el = await mount<El>(`<${tag}></${tag}>`);
      await updated();

      el.addEventListener('my-action', (e) => {
        received = e as CustomEvent;
      });
      el.active = true;
      await updated();

      expect(received).to.not.be.null;
    });

    it('dispatches event with detail payload', async () => {
      const tag = `test-emit-detail-${++_counter}`;
      let detail: unknown = null;

      class El extends BaseElement {
        static props: Props = { active: { type: Boolean } };
        declare active: boolean;

        protected onUpdated() {
          if (this.active) this.emit('value-change', { detail: { value: 42 } });
        }
      }
      customElements.define(tag, El);

      const el = await mount<El>(`<${tag}></${tag}>`);
      await updated();

      el.addEventListener('value-change', (e) => {
        detail = (e as CustomEvent).detail;
      });
      el.active = true;
      await updated();

      expect(detail).to.deep.equal({ value: 42 });
    });

    it('event bubbles and is composed by default', async () => {
      const tag = `test-emit-bubbles-${++_counter}`;
      let bubbled = false;

      class El extends BaseElement {
        static props: Props = { active: { type: Boolean } };
        declare active: boolean;

        protected onUpdated() {
          if (this.active) this.emit('bubble-test');
        }
      }
      customElements.define(tag, El);

      const el = await mount<El>(`<${tag}></${tag}>`);
      await updated();

      el.parentElement!.addEventListener('bubble-test', () => {
        bubbled = true;
      });
      el.active = true;
      await updated();

      expect(bubbled).to.be.true;
    });
  });

  describe('define() static method', () => {
    it('defines the element under the given tag name', () => {
      class MyTestWidget extends BaseElement {}
      MyTestWidget.define('my-test-widget');
      expect(customElements.get('my-test-widget')).to.equal(MyTestWidget);
    });

    it('uses explicit name argument when provided', () => {
      class RegisterExplicit extends BaseElement {}
      RegisterExplicit.define('reg-explicit-el');
      expect(customElements.get('reg-explicit-el')).to.equal(RegisterExplicit);
    });

    it('throws for a name without a dash', () => {
      class BadTag extends BaseElement {}
      expect(() => BadTag.define('nodash')).to.throw();
    });

    it('does not throw when the same tag is defined twice', () => {
      class DoubleReg extends BaseElement {}
      DoubleReg.define('double-reg-el');
      expect(() => DoubleReg.define('double-reg-el')).to.not.throw();
    });
  });

  describe('attributeChangedCallback same-value guard', () => {
    it('does not trigger an update when attribute is set to the same value', async () => {
      const tag = `test-attr-same-${++_counter}`;
      let renderCount = 0;

      class El extends BaseElement {
        static props: Props = { label: { type: String } };
        declare label: string;

        protected render() {
          renderCount++;
        }
      }
      customElements.define(tag, El);

      const el = await mount<El>(`<${tag} label="hello"></${tag}>`);
      await updated();
      renderCount = 0;

      el.setAttribute('label', 'hello'); // same value
      await updated();

      expect(renderCount).to.equal(0);
    });
  });

  describe('props inheritance chain', () => {
    it('child class inherits props from parent', async () => {
      const tag = `test-inherit-props-${++_counter}`;

      class Parent extends BaseElement {
        static props: Props = { name: { type: String } };
        declare name: string;
      }

      class Child extends Parent {
        static props: Props = { age: { type: Number } };
        declare age: number;
      }
      customElements.define(tag, Child);

      const el = await mount<Child>(`<${tag} name="Alice" age="30"></${tag}>`);
      expect(el.name).to.equal('Alice');
      expect(el.age).to.equal(30);
    });

    it('child props override parent props with the same key', async () => {
      const tag = `test-inherit-override-${++_counter}`;

      class ParentEl extends BaseElement {
        static props: Props = { value: { type: String } };
        declare value: string | number;
      }

      class ChildEl extends ParentEl {
        // override value prop with Number type
        static override props: Props = { value: { type: Number } };
      }
      customElements.define(tag, ChildEl);

      const el = await mount<ChildEl>(`<${tag} value="42"></${tag}>`);
      expect(el.value).to.equal(42); // Number, not string
    });
  });

  describe('pre-upgrade property handling', () => {
    it('property set before element upgrade is applied after initialization', async () => {
      const tag = `test-preupgrade-${++_counter}`;

      // Use innerHTML (not document.createElement) to create the element before it is defined,
      // bypassing the WTR safety patch that blocks document.createElement for unknown tags.
      const holder = document.createElement('div');
      holder.innerHTML = `<${tag}></${tag}>`;
      const el = holder.firstElementChild as BaseElement & { count: number };
      el.count = 99; // set pre-upgrade property

      class PreUpgradeEl extends BaseElement {
        static props: Props = { count: { type: Number } };
        declare count: number;
      }
      customElements.define(tag, PreUpgradeEl);
      document.body.appendChild(holder);
      await customElements.whenDefined(tag);
      await updated();

      expect(el.count).to.equal(99);
      document.body.removeChild(holder);
    });

    it('does not call setAttribute() synchronously during element upgrade', async () => {
      const tag = `test-preupgrade-no-attr-${++_counter}`;

      // Create element in a detached tree so upgrade happens on appendChild, not on define.
      const holder = document.createElement('div');
      holder.innerHTML = `<${tag}></${tag}>`;
      const el = holder.firstElementChild as BaseElement & { color: string };
      el.color = 'red'; // pre-upgrade JS value

      class UpgradeEl extends BaseElement {
        static props: Props = { color: { type: String } };
        declare color: string;
      }
      customElements.define(tag, UpgradeEl);

      // Spy: track any setAttribute calls on `el` that happen synchronously during upgrade.
      const setAttrCalls: string[] = [];
      const orig = Element.prototype.setAttribute;
      Element.prototype.setAttribute = function (this: Element, name: string, value: string) {
        if (this === el) setAttrCalls.push(name);
        return orig.call(this, name, value);
      };

      // Upgrade fires synchronously inside appendChild.
      document.body.appendChild(holder);
      // Restore spy immediately — we only care about synchronous calls during the constructor.
      Element.prototype.setAttribute = orig;

      expect(setAttrCalls).to.deep.equal([]);

      await updated();
      expect(el.getAttribute('color')).to.equal('red');
      document.body.removeChild(holder);
    });
  });
});
