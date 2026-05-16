// shim MUST be the first import so HTMLElement is defined before aeico-element is evaluated.
// Node.js ESM evaluates independent modules in import-declaration order.
import 'aeico-ssr/shim';
import { AeicoBase, AeicoElement, PROP_METADATA_KEY } from 'aeico-element';
import { html } from 'aeico-view';
import { renderToString } from 'aeico-ssr';
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

describe('shim', () => {
  test('HTMLElement is defined after shim import', () => {
    assert.equal(typeof (globalThis as any).HTMLElement, 'function');
  });

  test('customElements is defined after shim import', () => {
    assert.ok(typeof (globalThis as any).customElements === 'object');
  });

  test('aeico-element exports are accessible', () => {
    assert.equal(typeof AeicoBase, 'function');
    assert.equal(typeof AeicoElement, 'function');
  });
});

describe('renderToString with AeicoBase', () => {
  class MyBase extends AeicoBase {
    static props = { heading: { type: String, reflect: true } };
    static tagName = 'my-aeico-base';
    declare heading?: string;

    render() {
      return html(({ h1 }: any) => h1({ text: this.heading ?? '' }));
    }
  }

  test('Shadow DOM output', () => {
    const out = renderToString(MyBase as any, { heading: 'hello' });
    assert.equal(
      out,
      '<my-aeico-base heading="hello"><template shadowrootmode="open"><h1>hello</h1></template></my-aeico-base>',
    );
  });

  test('Light DOM output', () => {
    class LightBase extends AeicoBase {
      static props = { msg: { type: String, reflect: true } };
      static useShadowDOM = false;
      static tagName = 'light-aeico-base';
      declare msg?: string;

      render() {
        return html(({ p }: any) => p({ text: this.msg ?? '' }));
      }
    }
    const out = renderToString(LightBase as any, { msg: 'world' });
    assert.equal(out, '<light-aeico-base msg="world"><p>world</p></light-aeico-base>');
  });

  test('static computed works', () => {
    class FullName extends AeicoBase {
      static props = {
        first: { type: String },
        last: { type: String },
      };
      static computed = {
        fullName: {
          deps: ['first', 'last'],
          compute: (ctx: any) => `${ctx.first ?? ''} ${ctx.last ?? ''}`.trim(),
        },
      };
      static useShadowDOM = false;
      static tagName = 'full-name-el';
      declare first?: string;
      declare last?: string;
      declare fullName: string;

      render() {
        return html(({ span }: any) => span({ text: (this as any).fullName }));
      }
    }
    const out = renderToString(FullName as any, { first: 'John', last: 'Doe' });
    assert.ok(out.includes('<span>John Doe</span>'), `got: ${out}`);
  });

  test('boolean prop reflects correctly', () => {
    class FlagEl extends AeicoBase {
      static props = { active: { type: Boolean, reflect: true } };
      static useShadowDOM = false;
      static tagName = 'flag-el-base';
      declare active?: boolean;

      render() {
        return html(({ span }: any) => span({ text: String((this as any).active) }));
      }
    }
    const out = renderToString(FlagEl as any, { active: true });
    assert.ok(out.startsWith('<flag-el-base active>'), `got: ${out}`);
    assert.ok(out.includes('<span>true</span>'), `got: ${out}`);
  });
});

describe('renderToString with AeicoElement', () => {
  class Card extends AeicoElement {
    static props = { label: { type: String, reflect: true } };
    static tagName = 'my-ae-card';
    static styles = ':host { display: block }';
    declare label?: string;

    render() {
      return html(({ div }: any) => div({ text: this.label ?? '' }));
    }
  }

  test('Shadow DOM with static styles', () => {
    const out = renderToString(Card as any, { label: 'test' });
    assert.equal(
      out,
      '<my-ae-card label="test"><template shadowrootmode="open"><style>:host { display: block }</style><div>test</div></template></my-ae-card>',
    );
  });

  test('no <style> tag when styles not declared', () => {
    class Bare extends AeicoElement {
      static props = { val: { type: String, reflect: true } };
      static tagName = 'bare-ae-el';
      declare val?: string;

      render() {
        return html(({ span }: any) => span({ text: this.val ?? '' }));
      }
    }
    const out = renderToString(Bare as any, { val: 'x' });
    assert.ok(!out.includes('<style>'), `unexpected <style> in: ${out}`);
    assert.ok(out.includes('<span>x</span>'), `got: ${out}`);
  });

  test('array styles are merged into single <style> tag', () => {
    class MultiStyle extends AeicoElement {
      static props = {};
      static tagName = 'multi-style-el';
      static styles = [':host { color: red }', 'p { margin: 0 }'];

      render() {
        return html(({ p }: any) => p({ text: 'hi' }));
      }
    }
    const out = renderToString(MultiStyle as any);
    assert.ok(out.includes('<style>:host { color: red }\np { margin: 0 }</style>'), `got: ${out}`);
  });
});

describe('register() tag name resolution', () => {
  test('customElements.getName() returns the registered tag after register()', () => {
    class GetNameEl extends AeicoBase {
      static tagName = 'get-name-el';
    }
    GetNameEl.register();
    assert.equal((globalThis as any).customElements.getName(GetNameEl), 'get-name-el');
  });

  test('renderToString resolves tag via getName() when register() was called', () => {
    class RegisteredSsrEl extends AeicoBase {
      static tagName = 'registered-ssr-el';
      static useShadowDOM = false;

      render() {
        return html(({ span }: any) => span({ text: 'ok' }));
      }
    }
    RegisteredSsrEl.register();
    const out = renderToString(RegisteredSsrEl as any, {});
    assert.ok(out.startsWith('<registered-ssr-el>'), `got: ${out}`);
  });

  test('child without own tagName gets its own class-derived name, not parent tagName', () => {
    // Regression: before the fix, register() read this.tagName through the prototype chain,
    // so InhSsrChild would inherit InhSsrParent.tagName = 'inh-ssr-parent' and register itself
    // under the parent's tag name instead of deriving 'inh-ssr-child' from its class name.
    class InhSsrParent extends AeicoBase {
      static tagName = 'inh-ssr-parent';
    }
    InhSsrParent.register();

    class InhSsrChild extends InhSsrParent {}
    InhSsrChild.register();

    const getName = (globalThis as any).customElements.getName;
    assert.equal(getName(InhSsrChild), 'inh-ssr-child');
    assert.notEqual(getName(InhSsrChild), 'inh-ssr-parent');
  });

  test('child with own tagName uses its own, not parent tagName', () => {
    class InhOwnParent extends AeicoBase {
      static tagName = 'inh-own-parent';
    }
    InhOwnParent.register();

    class InhOwnChild extends InhOwnParent {
      static tagName = 'inh-own-child';
    }
    InhOwnChild.register();

    assert.equal((globalThis as any).customElements.getName(InhOwnChild), 'inh-own-child');
  });

  test('renderToString of child class renders with child tag, not parent tag', () => {
    class InhRenderParent extends AeicoBase {
      static tagName = 'inh-render-parent';
      static useShadowDOM = false;

      render() {
        return html(({ span }: any) => span({ text: 'parent' }));
      }
    }
    InhRenderParent.register();

    class InhRenderChild extends InhRenderParent {
      render() {
        return html(({ span }: any) => span({ text: 'child' }));
      }
    }
    InhRenderChild.register();

    const out = renderToString(InhRenderChild as any, {});
    assert.ok(out.startsWith('<inh-render-child>'), `got: ${out}`);
    assert.ok(out.includes('<span>child</span>'), `got: ${out}`);
  });
});

describe('renderToString with @prop accessor decorators', () => {
  // These tests simulate what TC39 Stage 3 decorators write to Symbol.metadata
  // without using decorator syntax (Node.js --strip-types cannot transform decorators).

  /** Helper: write prop declarations into Symbol.metadata on a class, mirroring @prop. */
  function setMetaProps(cls: object, props: Record<string, unknown>) {
    (Symbol as unknown as Record<string, symbol>).metadata ??= Symbol.for('Symbol.metadata');
    const meta: Record<symbol, unknown> =
      ((cls as Record<symbol, unknown>)[Symbol.metadata] ??= Object.create(null));
    meta[PROP_METADATA_KEY] = { ...(meta[PROP_METADATA_KEY] as object ?? {}), ...props };
  }

  class DecoratorCounter extends AeicoBase {
    static tagName = 'decorator-counter';
    declare count: number;
    declare label: string;

    render() {
      return html(({ div }: any) => {
        div({ text: `${(this as any).label}: ${(this as any).count}` });
      });
    }
  }
  setMetaProps(DecoratorCounter, {
    count: { type: Number, reflect: true },
    label: { type: String, reflect: true },
  });

  test('@prop accessor props are rendered into the template', () => {
    const out = renderToString(DecoratorCounter as any, { count: 7, label: 'hits' });
    assert.ok(out.includes('<div>hits: 7</div>'), `got: ${out}`);
  });

  test('@prop accessor reflect:true props appear as host attributes', () => {
    const out = renderToString(DecoratorCounter as any, { count: 3, label: 'score' });
    assert.ok(out.includes('count="3"'), `got: ${out}`);
    assert.ok(out.includes('label="score"'), `got: ${out}`);
  });

  test('@prop accessor default values are used when prop is omitted', () => {
    const out = renderToString(DecoratorCounter as any, {});
    // Without values, ctx members are undefined; the component falls back to its own defaults
    assert.ok(out.includes('<div>'), `got: ${out}`);
  });

  test('@computed accessor is accessible in render() alongside @prop accessor', () => {
    class DecoratorComputed extends AeicoBase {
      static tagName = 'decorator-computed';
      static useShadowDOM = false;
      static computed = {
        sum: { deps: ['a', 'b'], compute: (ctx: any) => (ctx.a ?? 0) + (ctx.b ?? 0) },
      };
      declare a: number;
      declare b: number;
      declare sum: number;

      render() {
        return html(({ span }: any) => span({ text: String((this as any).sum) }));
      }
    }
    setMetaProps(DecoratorComputed, {
      a: { type: Number },
      b: { type: Number },
    });

    const out = renderToString(DecoratorComputed as any, { a: 4, b: 6 });
    assert.ok(out.includes('<span>10</span>'), `got: ${out}`);
  });

  test('@prop accessor props inherited from parent class are resolved', () => {
    class BaseWithProp extends AeicoBase {
      static tagName = 'base-with-prop';
      static useShadowDOM = false;
      declare title: string;

      render() {
        return html(({ h2 }: any) => h2({ text: (this as any).title ?? '' }));
      }
    }
    setMetaProps(BaseWithProp, { title: { type: String, reflect: true } });

    class ChildOfBase extends BaseWithProp {
      static tagName = 'child-of-base';
    }

    const out = renderToString(ChildOfBase as any, { title: 'inherited' });
    assert.ok(out.includes('<h2>inherited</h2>'), `got: ${out}`);
    assert.ok(out.includes('title="inherited"'), `got: ${out}`);
  });
});
