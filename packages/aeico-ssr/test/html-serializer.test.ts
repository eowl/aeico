import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { HtmlSerializer } from 'aeico-ssr';

describe('HtmlSerializer', () => {
  test('basic tag with text prop', () => {
    const s = new HtmlSerializer();
    (s as any).div({ text: 'hello' });
    assert.equal(s.toString(), '<div>hello</div>');
  });

  test('nested tags via callback', () => {
    const s = new HtmlSerializer();
    (s as any).div({ className: 'box' }, () => {
      (s as any).span({ text: 'inner' });
    });
    assert.equal(s.toString(), '<div class="box"><span>inner</span></div>');
  });

  test('class object is flattened', () => {
    const s = new HtmlSerializer();
    (s as any).div({ className: { active: true, hidden: false } });
    assert.equal(s.toString(), '<div class="active"></div>');
  });

  test('style object is serialized', () => {
    const s = new HtmlSerializer();
    (s as any).div({ style: { color: 'red', '--x': '1' } });
    assert.match(s.toString(), /style="color:red;--x:1"/);
  });

  test('events are stripped from output', () => {
    const s = new HtmlSerializer();
    (s as any).button({ '@click': () => {}, text: 'click' });
    assert.equal(s.toString(), '<button>click</button>');
  });

  test('boolean true emits presence-only attribute', () => {
    const s = new HtmlSerializer();
    (s as any).input({ type: 'checkbox', disabled: true });
    assert.equal(s.toString(), '<input type="checkbox" disabled>');
  });

  test('boolean false omits attribute', () => {
    const s = new HtmlSerializer();
    (s as any).input({ disabled: false });
    assert.equal(s.toString(), '<input>');
  });

  test('key is emitted as data-key', () => {
    const s = new HtmlSerializer();
    (s as any).li({ key: 'item-1', text: 'A' });
    assert.equal(s.toString(), '<li data-key="item-1">A</li>');
  });

  test('void elements have no closing tag', () => {
    const s = new HtmlSerializer();
    (s as any).br();
    (s as any).hr();
    assert.equal(s.toString(), '<br><hr>');
  });

  test('text content is HTML-escaped', () => {
    const s = new HtmlSerializer();
    (s as any).div({ text: '<script>alert("xss")</script>' });
    assert.equal(s.toString(), '<div>&lt;script&gt;alert("xss")&lt;/script&gt;</div>');
  });

  test('attribute value is HTML-escaped', () => {
    const s = new HtmlSerializer();
    (s as any).input({ placeholder: '"hello"' });
    assert.equal(s.toString(), '<input placeholder="&quot;hello&quot;">');
  });

  test('text() method emits escaped text node', () => {
    const s = new HtmlSerializer();
    (s as any).div({}, () => { s.text('<em>hi</em>'); });
    assert.equal(s.toString(), '<div>&lt;em&gt;hi&lt;/em&gt;</div>');
  });

  test('fragment() runs callback inline', () => {
    const s = new HtmlSerializer();
    s.fragment(() => {
      (s as any).span({ text: 'a' });
      (s as any).span({ text: 'b' });
    });
    assert.equal(s.toString(), '<span>a</span><span>b</span>');
  });

  test('detached() runs fn and returns result', () => {
    const s = new HtmlSerializer();
    const result = s.detached(() => {
      (s as any).p({ text: 'detached' });
      return 42;
    });
    assert.equal(result, 42);
    assert.equal(s.toString(), '<p>detached</p>');
  });

  test('reset() clears accumulated output', () => {
    const s = new HtmlSerializer();
    (s as any).div({ text: 'first' });
    s.reset();
    (s as any).span({ text: 'second' });
    assert.equal(s.toString(), '<span>second</span>');
  });

  test('camelCase tag name is converted to kebab-case', () => {
    const s = new HtmlSerializer();
    (s as any).myCounter({ text: 'x' });
    assert.equal(s.toString(), '<my-counter>x</my-counter>');
  });

  // Raw text elements — content must NOT be HTML-entity-escaped.
  test('script text content is not HTML-escaped', () => {
    const s = new HtmlSerializer();
    (s as any).script({ text: 'if (a && b) { return a < b; }' });
    assert.equal(s.toString(), '<script>if (a && b) { return a < b; }</script>');
  });

  test('style text content is not HTML-escaped', () => {
    const s = new HtmlSerializer();
    (s as any).style({ text: 'p > span { color: red; }' });
    assert.equal(s.toString(), '<style>p > span { color: red; }</style>');
  });

  test('textarea text content is not HTML-escaped', () => {
    const s = new HtmlSerializer();
    (s as any).textarea({ text: 'a < b && c > d' });
    assert.equal(s.toString(), '<textarea>a < b && c > d</textarea>');
  });

  test('title text content is not HTML-escaped', () => {
    const s = new HtmlSerializer();
    (s as any).title({ text: 'Price < $10 & > $5' });
    assert.equal(s.toString(), '<title>Price < $10 & > $5</title>');
  });
});
