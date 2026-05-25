import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { html } from 'aeico-view';
import { renderToString } from 'aeico-ssr';
import 'aeico-ssr/shim';

// All component classes in this file are plain mock classes (no `extends HTMLElement`).
// Tests that use real AeicoBase / AeicoElement live in shim.test.ts.

describe('renderToString', () => {
  class MyCounter {
    static props = { count: { type: Number, reflect: true } };
    static useShadowDOM = true;
    count?: number;

    render() {
      return html(({ div }: any) => {
        div({ text: String(this.count ?? 0) });
      });
    }
  }
  customElements.define('my-counter', MyCounter as any);

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
    label?: string;

    render() {
      return html(({ p }: any) => {
        p({ text: this.label ?? '' });
      });
    }
  }
  customElements.define('my-light', MyLight as any);

  test('uses Light DOM when useShadowDOM = false', () => {
    const out = renderToString(MyLight as any, { label: 'hi' });
    assert.equal(out, '<my-light label="hi"><p>hi</p></my-light>');
  });

  test('throws if component is not registered', () => {
    class Unregistered {
      static props = {};
      static useShadowDOM = true;
      render() { return html(() => {}); }
    }
    assert.throws(() => renderToString(Unregistered as any), /is not registered/);
  });

  test('static styles are injected as <style> inside DSR template', () => {
    class Styled {
      static props = {};
      static useShadowDOM = true;
      static styles = ':host { color: red }';
      render() { return html(({ span }: any) => { span({ text: 'x' }); }); }
    }
    customElements.define('my-styled', Styled as any);
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
      static styles = 'p { margin: 0 }';
      render() { return html(({ p }: any) => { p({ text: 'y' }); }); }
    }
    customElements.define('my-styled-light', StyledLight as any);
    const out = renderToString(StyledLight as any);
    assert.equal(out, '<my-styled-light><style>p { margin: 0 }</style><p>y</p></my-styled-light>');
  });

  test('string prop coerced from number input', () => {
    class TypeEl {
      static props = { value: { type: String, reflect: true } };
      static useShadowDOM = false;
      value?: string;
      render() { return html(({ span }: any) => { span({ text: this.value ?? '' }); }); }
    }
    customElements.define('type-el', TypeEl as any);
    const out = renderToString(TypeEl as any, { value: 42 });
    assert.equal(out, '<type-el value="42"><span>42</span></type-el>');
  });

  test('number prop coerced from string input', () => {
    class NumEl {
      static props = { count: { type: Number, reflect: true } };
      static useShadowDOM = false;
      count?: number;
      render() { return html(({ span }: any) => { span({ text: String(this.count ?? 0) }); }); }
    }
    customElements.define('num-el', NumEl as any);
    const out = renderToString(NumEl as any, { count: '7' });
    assert.equal(out, '<num-el count="7"><span>7</span></num-el>');
  });

  test('boolean prop coerced from string "true"', () => {
    class BoolEl {
      static props = { active: { type: Boolean, reflect: true } };
      static useShadowDOM = false;
      active?: boolean;
      render() { return html(({ span }: any) => { span({ text: String(this.active) }); }); }
    }
    customElements.define('bool-el', BoolEl as any);
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
      visible?: string;
      internal?: string;
      render() { return html(({ span }: any) => { span({ text: this.visible ?? '' }); }); }
    }
    customElements.define('no-reflect-el', NoReflectEl as any);
    const out = renderToString(NoReflectEl as any, { visible: 'yes', internal: 'secret' });
    assert.ok(out.includes('visible="yes"'), 'visible should be reflected');
    assert.ok(!out.includes('internal'), 'internal should not appear in attributes');
  });

  test('boolean true prop emits presence-only attribute', () => {
    class BoolPresence {
      static props = { disabled: { type: Boolean, reflect: true } };
      static useShadowDOM = false;
      disabled?: boolean;
      render() { return html(() => {}); }
    }
    customElements.define('bool-presence', BoolPresence as any);
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
      a?: number;
      b?: number;
      declare sum: number;
      render() {
        return html(({ span }: any) => { span({ text: String((this as any).sum) }); });
      }
    }
    customElements.define('computed-el', ComputedEl as any);
    const out = renderToString(ComputedEl as any, { a: 3, b: 4 });
    assert.equal(out, '<computed-el a="3" b="4"><span>7</span></computed-el>');
  });

  test('slotContent injects default slot content into shadow DOM host light DOM', () => {
    const out = renderToString(
      MyCounter as any,
      { count: 1 },
      html(({ p }: any) => { p({ text: 'slot content' }); }),
    );
    assert.equal(
      out,
      '<my-counter count="1"><template shadowrootmode="open"><div>1</div></template><p>slot content</p></my-counter>',
    );
  });

  test('slotContent injects named slot content via slot attribute', () => {
    const out = renderToString(
      MyCounter as any,
      { count: 2 },
      html(({ p, span }: any) => {
        p({ text: 'default' });
        span({ slot: 'footer', text: 'footer text' });
      }),
    );
    assert.equal(
      out,
      '<my-counter count="2"><template shadowrootmode="open"><div>2</div></template><p>default</p><span slot="footer">footer text</span></my-counter>',
    );
  });

  test('slotContent works with light DOM component', () => {
    const out = renderToString(
      MyLight as any,
      { label: 'hi' },
      html(({ span }: any) => { span({ text: 'extra' }); }),
    );
    assert.equal(out, '<my-light label="hi"><p>hi</p><span>extra</span></my-light>');
  });

  test('slotContent can be defined once and reused', () => {
    const slot = html(({ p }: any) => { p({ text: 'reused' }); });
    const a = renderToString(MyCounter as any, { count: 1 }, slot);
    const b = renderToString(MyCounter as any, { count: 2 }, slot);
    assert.ok(a.endsWith('<p>reused</p></my-counter>'));
    assert.ok(b.endsWith('<p>reused</p></my-counter>'));
  });

  test('omitting slotContent produces same output as before', () => {
    const withoutSlot = renderToString(MyCounter as any, { count: 3 });
    assert.equal(
      withoutSlot,
      '<my-counter count="3"><template shadowrootmode="open"><div>3</div></template></my-counter>',
    );
  });
});
