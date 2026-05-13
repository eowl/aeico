import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { html } from 'aeico-view';
import { renderToString } from 'aeico-ssr';

// All component classes in this file are plain mock classes (no `extends HTMLElement`).
// Tests that use real AeicoBase / AeicoElement live in shim.test.ts.

describe('renderToString', () => {
  class MyCounter {
    static props = { count: { type: Number, reflect: true } };
    static useShadowDOM = true;
    static tagName = 'my-counter';
    count?: number;

    render() {
      return html(({ div }: any) => {
        div({ text: String(this.count ?? 0) });
      });
    }
  }

  test('wraps output in DSR template', () => {
    const out = renderToString(MyCounter as any, { count: 5 });
    assert.equal(
      out,
      '<my-counter count="5"><template shadowrootmode="open"><div>5</div></template></my-counter>',
    );
  });

  class MyLight {
    static props = { label: { type: String, reflect: true } };
    static useShadowDOM = false;
    static tagName = 'my-light';
    label?: string;

    render() {
      return html(({ p }: any) => {
        p({ text: this.label ?? '' });
      });
    }
  }

  test('uses Light DOM when useShadowDOM = false', () => {
    const out = renderToString(MyLight as any, { label: 'hi' });
    assert.equal(out, '<my-light label="hi"><p>hi</p></my-light>');
  });

  test('throws for invalid tag name', () => {
    class Foo {
      static props = {};
      static useShadowDOM = true;
      static tagName = undefined;
      static name = 'Foo'; // no dash — invalid custom element name
      render() { return html(() => {}); }
    }
    assert.throws(() => renderToString(Foo as any), /tag name/);
  });

  test('static styles are injected as <style> inside DSR template', () => {
    class Styled {
      static props = {};
      static useShadowDOM = true;
      static tagName = 'my-styled';
      static styles = ':host { color: red }';
      render() { return html(({ span }: any) => { span({ text: 'x' }); }); }
    }
    const out = renderToString(Styled as any);
    assert.equal(
      out,
      '<my-styled><template shadowrootmode="open"><style>:host { color: red }</style><span>x</span></template></my-styled>',
    );
  });

  test('static styles are injected for Light DOM too', () => {
    class StyledLight {
      static props = {};
      static useShadowDOM = false;
      static tagName = 'my-styled-light';
      static styles = 'p { margin: 0 }';
      render() { return html(({ p }: any) => { p({ text: 'y' }); }); }
    }
    const out = renderToString(StyledLight as any);
    assert.equal(out, '<my-styled-light><style>p { margin: 0 }</style><p>y</p></my-styled-light>');
  });

  test('string prop coerced from number input', () => {
    class TypeEl {
      static props = { value: { type: String, reflect: true } };
      static useShadowDOM = false;
      static tagName = 'type-el';
      value?: string;
      render() { return html(({ span }: any) => { span({ text: this.value ?? '' }); }); }
    }
    const out = renderToString(TypeEl as any, { value: 42 });
    assert.equal(out, '<type-el value="42"><span>42</span></type-el>');
  });

  test('number prop coerced from string input', () => {
    class NumEl {
      static props = { count: { type: Number, reflect: true } };
      static useShadowDOM = false;
      static tagName = 'num-el';
      count?: number;
      render() { return html(({ span }: any) => { span({ text: String(this.count ?? 0) }); }); }
    }
    const out = renderToString(NumEl as any, { count: '7' });
    assert.equal(out, '<num-el count="7"><span>7</span></num-el>');
  });

  test('boolean prop coerced from string "true"', () => {
    class BoolEl {
      static props = { active: { type: Boolean, reflect: true } };
      static useShadowDOM = false;
      static tagName = 'bool-el';
      active?: boolean;
      render() { return html(({ span }: any) => { span({ text: String(this.active) }); }); }
    }
    const out = renderToString(BoolEl as any, { active: 'true' });
    assert.equal(out, '<bool-el active><span>true</span></bool-el>');
  });

  test('reflect: false prop is not included in host attributes', () => {
    class NoReflectEl {
      static props = {
        visible: { type: String, reflect: true },
        internal: { type: String, reflect: false },
      };
      static useShadowDOM = false;
      static tagName = 'no-reflect-el';
      visible?: string;
      internal?: string;
      render() { return html(({ span }: any) => { span({ text: this.visible ?? '' }); }); }
    }
    const out = renderToString(NoReflectEl as any, { visible: 'yes', internal: 'secret' });
    assert.ok(out.includes('visible="yes"'), 'visible should be reflected');
    assert.ok(!out.includes('internal'), 'internal should not appear in attributes');
  });

  test('boolean true prop emits presence-only attribute', () => {
    class BoolPresence {
      static props = { disabled: { type: Boolean, reflect: true } };
      static useShadowDOM = false;
      static tagName = 'bool-presence';
      disabled?: boolean;
      render() { return html(() => {}); }
    }
    const out = renderToString(BoolPresence as any, { disabled: true });
    assert.ok(out.startsWith('<bool-presence disabled>'), `got: ${out}`);
  });

  test('static computed property is accessible in render()', () => {
    class ComputedEl {
      static props = { a: { type: Number }, b: { type: Number } };
      static computed = {
        sum: { compute: (ctx: any) => (ctx.a ?? 0) + (ctx.b ?? 0) },
      };
      static useShadowDOM = false;
      static tagName = 'computed-el';
      a?: number;
      b?: number;
      declare sum: number;
      render() {
        return html(({ span }: any) => { span({ text: String((this as any).sum) }); });
      }
    }
    const out = renderToString(ComputedEl as any, { a: 3, b: 4 });
    assert.equal(out, '<computed-el a="3" b="4"><span>7</span></computed-el>');
  });
});
