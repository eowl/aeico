// shim MUST be the first import so HTMLElement is defined before aeico-element is evaluated.
// Node.js ESM evaluates independent modules in import-declaration order.
import 'aeico-ssr/shim';
import { AeicoBase, AeicoElement } from 'aeico-element';
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
