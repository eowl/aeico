import { expect } from '@esm-bundle/chai';
import Reconciler from '../../src/reconciler.js';

describe('Reconciler', () => {
  let builder: Reconciler;

  const SVG_NS = 'http://www.w3.org/2000/svg';

  beforeEach(() => {
    builder = new Reconciler();
  });

  describe('HTML element creation', () => {
    it('creates elements with different tag names', () => {
      const div = builder.div();
      const span = builder.span();
      const button = builder.button();

      expect(div.tagName).to.equal('DIV');
      expect(span.tagName).to.equal('SPAN');
      expect(button.tagName).to.equal('BUTTON');
    });

    it('creates an anchor element with href', () => {
      const anchor = builder.a({ href: 'https://example.com' });
      expect(anchor).to.be.instanceOf(HTMLAnchorElement);
      expect(anchor.href).to.equal('https://example.com/');
    });

    it('creates input elements with type attribute', () => {
      const input = builder.input({ type: 'checkbox' });
      expect(input).to.be.instanceOf(HTMLInputElement);
      expect(input.type).to.equal('checkbox');
    });
  });

  describe('SVG element creation', () => {
    it('creates an svg element with proper namespace', () => {
      const svg = builder.svg();
      expect(svg).to.be.instanceOf(SVGSVGElement);
      expect(svg.namespaceURI).to.equal(SVG_NS);
    });

    it('creates nested SVG elements with proper namespace', () => {
      const svg = builder.svg({}, () => {
        builder.circle({ cx: '50', cy: '50', r: '40' });
        builder.rect({ x: '10', y: '10', width: '80', height: '80' });
      });

      const circle = svg.querySelector('circle');
      const rect = svg.querySelector('rect');

      expect(circle).to.be.instanceOf(SVGCircleElement);
      expect(rect).to.be.instanceOf(SVGRectElement);
      expect(circle?.namespaceURI).to.equal(SVG_NS);
      expect(rect?.namespaceURI).to.equal(SVG_NS);
    });

    it('creates path element with proper namespace', () => {
      const svg = builder.svg({}, () => {
        builder.path({ d: 'M10 10 H 90 V 90 H 10 Z' });
      });

      const path = svg.querySelector('path');
      expect(path).to.be.instanceOf(SVGPathElement);
      expect(path?.namespaceURI).to.equal(SVG_NS);
    });
  });

  describe('Property application', () => {
    describe('className', () => {
      it('sets className from string', () => {
        const el = builder.div({ className: 'foo bar' });
        expect(el.className).to.equal('foo bar');
      });

      it('sets class from string using "class" key', () => {
        const el = builder.div({ class: 'baz qux' });
        expect(el.className).to.equal('baz qux');
      });

      it('sets className from object with active classes', () => {
        const el = builder.div({
          className: {
            active: true,
            disabled: false,
            selected: true,
          },
        });
        expect(el.className).to.equal('active selected');
      });

      it('handles empty className object', () => {
        const el = builder.div({
          className: {
            disabled: false,
            hidden: false,
          },
        });
        expect(el.className).to.equal('');
      });
    });

    describe('textContent', () => {
      it('sets textContent from string', () => {
        const el = builder.div({ textContent: 'Hello World' });
        expect(el.textContent).to.equal('Hello World');
      });

      it('sets textContent from number', () => {
        const el = builder.span({ textContent: 42 as any });
        expect(el.textContent).to.equal('42');
      });
    });

    describe('innerHTML', () => {
      it('sets innerHTML from string', () => {
        const el = builder.div({ innerHTML: '<span>hello</span>' });
        expect(el.innerHTML).to.equal('<span>hello</span>');
        expect(el.children.length).to.equal(1);
        expect(el.children[0].tagName).to.equal('SPAN');
        expect(el.children[0].textContent).to.equal('hello');
      });

      it('innerHTML is overridden by children callback', () => {
        const el = builder.div({ innerHTML: '<ignored>' }, () => {
          builder.span({ textContent: 'visible' });
        });
        expect(el.children.length).to.equal(1);
        expect(el.children[0].textContent).to.equal('visible');
        expect(el.innerHTML).to.equal('<span>visible</span>');
      });
    });

    describe('id and common attributes', () => {
      it('sets id, part, role, and aria attributes', () => {
        const el = builder.button({
          id: 'my-element',
          part: 'container',
          role: 'tab',
          'aria-label': 'Close',
          'aria-expanded': 'false',
        });
        expect(el.id).to.equal('my-element');
        expect(el.getAttribute('part')).to.equal('container');
        expect(el.getAttribute('role')).to.equal('tab');
        expect(el.getAttribute('aria-label')).to.equal('Close');
        expect(el.getAttribute('aria-expanded')).to.equal('false');
      });
    });

    describe('style', () => {
      it('sets style from object', () => {
        const el = builder.div({
          style: {
            color: 'red',
            backgroundColor: 'blue',
            fontSize: '16px',
          },
        });
        expect(el.style.color).to.equal('red');
        expect(el.style.backgroundColor).to.equal('blue');
        expect(el.style.fontSize).to.equal('16px');
      });

      it('handles empty style object', () => {
        const el = builder.div({ style: {} });
        expect(el.style.cssText).to.equal('');
      });

      it('sets CSS custom properties via setProperty', () => {
        const el = builder.div({ style: { '--field-min-width': '100px' } });
        expect(el.style.getPropertyValue('--field-min-width')).to.equal('100px');
      });

      it('sets mixed regular and custom properties', () => {
        const el = builder.div({ style: { color: 'red', '--my-color': 'blue' } });
        expect(el.style.color).to.equal('red');
        expect(el.style.getPropertyValue('--my-color')).to.equal('blue');
      });

      it('removes CSS custom properties when style prop is dropped', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);

        builder.build(container, () => {
          builder.div({ style: { '--foo': '42px' } });
        });
        const el = container.firstElementChild as HTMLElement;
        expect(el.style.getPropertyValue('--foo')).to.equal('42px');

        builder.build(container, () => {
          builder.div({});
        });
        expect(el.style.getPropertyValue('--foo')).to.equal('');

        container.remove();
      });
    });

    describe('boolean attributes', () => {
      it('sets boolean attribute when true', () => {
        const el = builder.input({ disabled: true });
        expect(el.hasAttribute('disabled')).to.be.true;
        expect(el.getAttribute('disabled')).to.equal('');
      });

      it('does not set boolean attribute when false', () => {
        const el = builder.input({ disabled: false });
        expect(el.hasAttribute('disabled')).to.be.false;
      });

      it('handles multiple boolean attributes', () => {
        const el = builder.input({
          disabled: true,
          required: true,
          readonly: false,
        });
        expect(el.hasAttribute('disabled')).to.be.true;
        expect(el.hasAttribute('required')).to.be.true;
        expect(el.hasAttribute('readonly')).to.be.false;
      });
    });

    describe('event listeners', () => {
      it('attaches click event listener', (done) => {
        const el = builder.button({
          '@click': (e: Event) => {
            expect(e.type).to.equal('click');
            done();
          },
        });
        el.click();
      });

      it('attaches input event listener', (done) => {
        const el = builder.input({
          '@input': (e: Event) => {
            expect(e.type).to.equal('input');
            done();
          },
        });
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });

      it('attaches change event listener', (done) => {
        const el = builder.select({
          '@change': (e: Event) => {
            expect(e.type).to.equal('change');
            done();
          },
        });
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });

      it('@mouseover listens to mouseover event', (done) => {
        const el = builder.div({
          '@mouseover': (e: Event) => {
            expect(e.type).to.equal('mouseover');
            done();
          },
        });
        el.dispatchEvent(new Event('mouseover', { bubbles: true }));
      });

      it('@tab-change listens to tab-change event (no case conversion)', (done) => {
        const el = builder.div({
          '@tab-change': (e: Event) => {
            expect(e.type).to.equal('tab-change');
            done();
          },
        });
        el.dispatchEvent(new CustomEvent('tab-change', { bubbles: true }));
      });

      it('@field-reset listens to field-reset event (no case conversion)', (done) => {
        const el = builder.div({
          '@field-reset': (e: Event) => {
            expect(e.type).to.equal('field-reset');
            done();
          },
        });
        el.dispatchEvent(new CustomEvent('field-reset', { bubbles: true }));
      });

      it('removes old listener and attaches new one on update', (done) => {
        const root = document.createElement('div');
        let firstCalled = false;

        builder.build(root, () => {
          builder.button({
            '@click': () => {
              firstCalled = true;
            },
          });
        });

        builder.build(root, () => {
          builder.button({
            '@click': () => {
              expect(firstCalled).to.be.false;
              done();
            },
          });
        });
        (root.firstChild as HTMLElement).click();
      });

      it('removes listener when handler is removed from props', () => {
        const root = document.createElement('div');
        let called = false;

        builder.build(root, () => {
          builder.button({
            '@click': () => {
              called = true;
            },
          });
        });

        builder.build(root, () => {
          builder.button({});
        });
        (root.firstChild as HTMLElement).click();
        expect(called).to.be.false;
      });
    });

    describe('null and undefined handling', () => {
      it('ignores null, undefined and false values', () => {
        const el = builder.div({
          title: null as any,
          'data-a': undefined,
          'data-b': false as any,
          id: 'test',
        });
        expect(el.hasAttribute('title')).to.be.false;
        expect(el.hasAttribute('data-a')).to.be.false;
        expect(el.hasAttribute('data-b')).to.be.false;
        expect(el.id).to.equal('test');
      });
    });

    describe('custom attributes', () => {
      it('sets data attributes', () => {
        const el = builder.div({
          'data-id': '123',
          'data-name': 'test',
        });
        expect(el.getAttribute('data-id')).to.equal('123');
        expect(el.getAttribute('data-name')).to.equal('test');
      });

      it('sets any custom attribute', () => {
        const el = builder.div({
          'custom-attr': 'value',
          'x-data': 'some-data',
        });
        expect(el.getAttribute('custom-attr')).to.equal('value');
        expect(el.getAttribute('x-data')).to.equal('some-data');
      });
    });
  });

  describe('Nested elements (stack)', () => {
    it('creates nested elements using callback', () => {
      const parent = builder.div({}, () => {
        builder.span({ textContent: 'Child' });
      });

      expect(parent.children.length).to.equal(1);
      expect(parent.children[0].tagName).to.equal('SPAN');
      expect(parent.children[0].textContent).to.equal('Child');
    });

    it('creates deeply nested elements', () => {
      const root = builder.div({ id: 'root' }, () => {
        builder.section({ id: 'section' }, () => {
          builder.article({ id: 'article' }, () => {
            builder.p({ textContent: 'Deep content' });
          });
        });
      });

      const section = root.querySelector('#section');
      const article = section?.querySelector('#article');
      const p = article?.querySelector('p');

      expect(section).to.exist;
      expect(article).to.exist;
      expect(p?.textContent).to.equal('Deep content');
    });

    it('creates multiple siblings', () => {
      const parent = builder.ul({}, () => {
        builder.li({ textContent: 'Item 1' });
        builder.li({ textContent: 'Item 2' });
        builder.li({ textContent: 'Item 3' });
      });

      expect(parent.children.length).to.equal(3);
      expect(parent.children[0].textContent).to.equal('Item 1');
      expect(parent.children[1].textContent).to.equal('Item 2');
      expect(parent.children[2].textContent).to.equal('Item 3');
    });

    it('correctly restores stack after nested callback', () => {
      const first = builder.div({ id: 'first' }, () => {
        builder.span({ textContent: 'Child of first' });
      });

      const second = builder.div({ id: 'second' }, () => {
        builder.span({ textContent: 'Child of second' });
      });

      expect(first.children.length).to.equal(1);
      expect(first.children[0].textContent).to.equal('Child of first');
      expect(second.children.length).to.equal(1);
      expect(second.children[0].textContent).to.equal('Child of second');
    });

    it('handles complex nested structure', () => {
      const container = builder.div({ className: 'container' }, () => {
        builder.header({}, () => {
          builder.h1({ textContent: 'Title' });
          builder.nav({}, () => {
            builder.a({ href: '#home', textContent: 'Home' });
            builder.a({ href: '#about', textContent: 'About' });
          });
        });
        builder.main({}, () => {
          builder.p({ textContent: 'Content' });
        });
        builder.footer({}, () => {
          builder.p({ textContent: 'Footer' });
        });
      });

      expect(container.children.length).to.equal(3);
      expect(container.querySelector('header')).to.exist;
      expect(container.querySelector('main')).to.exist;
      expect(container.querySelector('footer')).to.exist;
      expect(container.querySelectorAll('nav a').length).to.equal(2);
    });

    it('allows omitting props when only a callback is needed', () => {
      const parent = builder.div(() => {
        builder.span({ textContent: 'Child' });
      });

      expect(parent.children.length).to.equal(1);
      expect(parent.children[0].tagName).to.equal('SPAN');
      expect(parent.children[0].textContent).to.equal('Child');
    });

    it('allows omitting props in deeply nested structure', () => {
      const root = builder.div(() => {
        builder.section(() => {
          builder.p({ textContent: 'Deep' });
        });
      });

      expect(root.querySelector('p')?.textContent).to.equal('Deep');
    });

    it('allows mixing props-only and callback-only calls as siblings', () => {
      const parent = builder.ul(() => {
        builder.li({ textContent: 'Item 1' });
        builder.li(() => {
          builder.span({ textContent: 'Item 2' });
        });
      });

      expect(parent.children.length).to.equal(2);
      expect(parent.children[0].textContent).to.equal('Item 1');
      expect(parent.children[1].querySelector('span')?.textContent).to.equal('Item 2');
    });
  });

  describe('el() method', () => {
    it('creates element using el method', () => {
      const div = builder.el('div');
      expect(div).to.be.instanceOf(HTMLDivElement);
      expect(div.tagName).to.equal('DIV');
    });

    it('creates element with props using el method', () => {
      const button = builder.el('button', { id: 'btn', textContent: 'Click' });
      expect(button.id).to.equal('btn');
      expect(button.textContent).to.equal('Click');
    });

    it('creates nested elements using el method', () => {
      const parent = builder.el('div', {}, () => {
        builder.el('span', { textContent: 'Child' });
      });

      expect(parent.children.length).to.equal(1);
      expect(parent.children[0].tagName).to.equal('SPAN');
    });

    it('allows omitting props when only a callback is needed in el method', () => {
      const parent = builder.el('div', () => {
        builder.el('span', { textContent: 'Child' });
      });

      expect(parent.children.length).to.equal(1);
      expect(parent.children[0].tagName).to.equal('SPAN');
      expect(parent.children[0].textContent).to.equal('Child');
    });

    it('creates SVG element using el method', () => {
      const svg = builder.el('svg');
      expect(svg).to.be.instanceOf(SVGSVGElement);
      expect(svg.namespaceURI).to.equal('http://www.w3.org/2000/svg');
    });
  });

  describe('Custom elements (camelCase kebab-case)', () => {
    before(() => {
      if (!customElements.get('my-widget'))
        customElements.define('my-widget', class extends HTMLElement {});
      if (!customElements.get('ae-button'))
        customElements.define('ae-button', class extends HTMLElement {});
      if (!customElements.get('ae-icon-button'))
        customElements.define('ae-icon-button', class extends HTMLElement {});
    });

    it('creates a custom element via camelCase property', () => {
      const el = (builder as any).myWidget();
      expect(el.tagName).to.equal('MY-WIDGET');
    });

    it('creates multi-segment custom element (ae-button aeButton)', () => {
      const el = (builder as any).aeButton();
      expect(el.tagName).to.equal('AE-BUTTON');
    });

    it('creates multi-segment custom element with three parts (aeIconButton ae-icon-button)', () => {
      const el = (builder as any).aeIconButton();
      expect(el.tagName).to.equal('AE-ICON-BUTTON');
    });

    it('passes props to custom element', () => {
      const el = (builder as any).aeButton({ color: 'primary', disabled: true });
      expect(el.getAttribute('color')).to.equal('primary');
      expect(el.hasAttribute('disabled')).to.be.true;
    });

    it('creates custom element with children callback', () => {
      const el = (builder as any).aeButton({}, () => {
        builder.span({ textContent: 'Label' });
      });
      expect(el.tagName).to.equal('AE-BUTTON');
      expect(el.querySelector('span')?.textContent).to.equal('Label');
    });

    it('allows omitting props for custom element when only a callback is needed', () => {
      const el = (builder as any).aeButton(() => {
        builder.span({ textContent: 'Label' });
      });
      expect(el.tagName).to.equal('AE-BUTTON');
      expect(el.querySelector('span')?.textContent).to.equal('Label');
    });

    it('does not affect native elements (no uppercase, no conversion)', () => {
      const div = builder.div();
      expect(div.tagName).to.equal('DIV');
      const button = builder.button();
      expect(button.tagName).to.equal('BUTTON');
    });

    it('custom element is reused by build() reconciliation', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      builder.build(container, () => {
        (builder as any).aeButton({ id: 'btn1' });
      });
      const original = container.firstElementChild;

      builder.build(container, () => {
        (builder as any).aeButton({ id: 'btn1', color: 'primary' });
      });

      expect(container.firstElementChild).to.equal(original);
      expect(container.firstElementChild?.getAttribute('color')).to.equal('primary');
      container.remove();
    });
  });

  describe('text() method', () => {
    it('appends text node to parent in stack', () => {
      const parent = builder.div({}, () => {
        builder.text('Text content');
      });

      expect(parent.childNodes.length).to.equal(1);
      expect(parent.childNodes[0]).to.be.instanceOf(Text);
      expect(parent.textContent).to.equal('Text content');
    });

    it('creates multiple text nodes', () => {
      const parent = builder.div({}, () => {
        builder.text('First ');
        builder.text('Second ');
        builder.text('Third');
      });

      expect(parent.childNodes.length).to.equal(3);
      expect(parent.textContent).to.equal('First Second Third');
    });

    it('mixes text nodes with element nodes', () => {
      const parent = builder.div({}, () => {
        builder.text('Before ');
        builder.strong({ textContent: 'bold' });
        builder.text(' after');
      });

      expect(parent.childNodes.length).to.equal(3);
      expect(parent.textContent).to.equal('Before bold after');
      expect(parent.querySelector('strong')?.textContent).to.equal('bold');
    });
  });

  describe('node() method', () => {
    it('appends existing nodes to parent', () => {
      const node1 = document.createElement('span');
      node1.textContent = 'Node 1';
      const node2 = document.createElement('span');
      node2.textContent = 'Node 2';

      const parent = builder.div({}, () => {
        builder.node(node1);
        builder.node(node2);
      });

      expect(parent.children.length).to.equal(2);
      expect(parent.children[0]).to.equal(node1);
      expect(parent.children[1]).to.equal(node2);
    });

    it('appends text node using node method', () => {
      const textNode = document.createTextNode('Text via node()');

      const parent = builder.div({}, () => {
        builder.node(textNode);
      });

      expect(parent.childNodes.length).to.equal(1);
      expect(parent.childNodes[0]).to.equal(textNode);
      expect(parent.textContent).to.equal('Text via node()');
    });

    it('returns the appended node', () => {
      const existingNode = document.createElement('p');
      builder.div({}, () => {
        const returned = builder.node(existingNode);
        expect(returned).to.equal(existingNode);
      });
    });
  });

  describe('fragment() method', () => {
    it('creates a document fragment', () => {
      const frag = builder.fragment(() => {
        builder.div({ textContent: 'In fragment' });
      });

      expect(frag).to.be.instanceOf(DocumentFragment);
      expect(frag.children.length).to.equal(1);
      expect(frag.children[0].textContent).to.equal('In fragment');
    });

    it('creates fragment with multiple elements', () => {
      const frag = builder.fragment(() => {
        builder.div({ textContent: 'First' });
        builder.span({ textContent: 'Second' });
        builder.p({ textContent: 'Third' });
      });

      expect(frag.children.length).to.equal(3);
      expect(frag.children[0].tagName).to.equal('DIV');
      expect(frag.children[1].tagName).to.equal('SPAN');
      expect(frag.children[2].tagName).to.equal('P');
    });

    it('creates fragment with nested elements', () => {
      const frag = builder.fragment(() => {
        builder.div({}, () => {
          builder.span({ textContent: 'Nested' });
        });
      });

      const div = frag.querySelector('div');
      expect(div?.children.length).to.equal(1);
      expect(div?.children[0].textContent).to.equal('Nested');
    });

    it('can append fragment to element', () => {
      const frag = builder.fragment(() => {
        builder.li({ textContent: 'Item 1' });
        builder.li({ textContent: 'Item 2' });
      });

      const list = builder.ul();
      list.appendChild(frag);

      expect(list.children.length).to.equal(2);
      expect(list.children[0].textContent).to.equal('Item 1');
      expect(list.children[1].textContent).to.equal('Item 2');
    });
  });

  describe('Complex scenarios', () => {
    it('builds a complete form', () => {
      const form = builder.form({ id: 'my-form', action: '/submit' }, () => {
        builder.div({ className: 'form-group' }, () => {
          builder.label({ for: 'name', textContent: 'Name:' });
          builder.input({ type: 'text', id: 'name', name: 'name', required: true });
        });

        builder.div({ className: 'form-group' }, () => {
          builder.label({ for: 'email', textContent: 'Email:' });
          builder.input({ type: 'email', id: 'email', name: 'email', required: true });
        });

        builder.button({ type: 'submit', textContent: 'Submit' });
      });

      expect(form.id).to.equal('my-form');
      expect(form.getAttribute('action')).to.equal('/submit');
      expect(form.querySelectorAll('.form-group').length).to.equal(2);
      expect(form.querySelectorAll('input').length).to.equal(2);
      expect(form.querySelector('button[type="submit"]')).to.exist;
    });

    it('builds an SVG icon', () => {
      const icon = builder.svg(
        {
          viewBox: '0 0 24 24',
          width: '24',
          height: '24',
          fill: 'currentColor',
        },
        () => {
          builder.path({ d: 'M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z' });
        },
      );

      expect(icon.getAttribute('viewBox')).to.equal('0 0 24 24');
      expect(icon.querySelector('path')).to.exist;
      expect(icon.querySelector('path')?.getAttribute('d')).to.include('M12 2L2 7');
    });

    it('builds a table structure', () => {
      const table = builder.table({}, () => {
        builder.thead({}, () => {
          builder.tr({}, () => {
            builder.th({ textContent: 'Name' });
            builder.th({ textContent: 'Age' });
          });
        });
        builder.tbody({}, () => {
          builder.tr({}, () => {
            builder.td({ textContent: 'Alice' });
            builder.td({ textContent: '30' });
          });
          builder.tr({}, () => {
            builder.td({ textContent: 'Bob' });
            builder.td({ textContent: '25' });
          });
        });
      });

      expect(table.querySelector('thead')).to.exist;
      expect(table.querySelector('tbody')).to.exist;
      expect(table.querySelectorAll('th').length).to.equal(2);
      expect(table.querySelectorAll('tbody tr').length).to.equal(2);
    });
  });

  describe('Edge cases', () => {
    it('handles empty callback', () => {
      const el = builder.div({}, () => {});
      expect(el.children.length).to.equal(0);
    });

    it('handles no props or empty props', () => {
      const el1 = builder.div();
      const el2 = builder.div({});
      expect(el1.tagName).to.equal('DIV');
      expect(el1.attributes.length).to.equal(0);
      expect(el2.tagName).to.equal('DIV');
      expect(el2.attributes.length).to.equal(0);
    });

    it('creates element without parent in stack', () => {
      const el = builder.div({ textContent: 'Standalone' });
      expect(el.parentNode).to.be.null;
    });

    it('handles special characters in textContent', () => {
      const el = builder.div({ textContent: '<script>alert("XSS")</script>' });
      expect(el.textContent).to.equal('<script>alert("XSS")</script>');
      expect(el.querySelector('script')).to.be.null;
    });

    it('handles attribute values with special characters', () => {
      const el = builder.div({
        title: 'Quote " and apostrophe \' and <tag>',
        'data-value': '{"key": "value"}',
      });
      expect(el.getAttribute('title')).to.equal('Quote " and apostrophe \' and <tag>');
      expect(el.getAttribute('data-value')).to.equal('{"key": "value"}');
    });
  });

  describe('Object/array property assignment', () => {
    before(() => {
      if (!customElements.get('test-obj-element')) {
        customElements.define(
          'test-obj-element',
          class extends HTMLElement {
            data: object | null = null;
            items: unknown[] | null = null;
          },
        );
      }
    });

    it('sets object property via DOM property assignment', () => {
      const obj = { x: 1, y: 2 };
      const el = (builder as any)['test-obj-element']({ data: obj }) as HTMLElement & {
        data: object | null;
      };
      expect(el.data).to.equal(obj);
      expect(el.getAttribute('data')).to.be.null;
    });

    it('updates object property when reference changes', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      const obj1 = { value: 'first' };
      const obj2 = { value: 'second' };

      builder.build(container, () => {
        (builder as any)['test-obj-element']({ data: obj1 });
      });
      const el = container.firstElementChild as HTMLElement & { data: object | null };
      expect(el.data).to.equal(obj1);

      builder.build(container, () => {
        (builder as any)['test-obj-element']({ data: obj2 });
      });
      expect(container.firstElementChild).to.equal(el);
      expect(el.data).to.equal(obj2);

      container.remove();
    });

    it('skips reassignment when same object reference', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      const obj = { value: 'same' };
      let assignCount = 0;

      builder.build(container, () => {
        (builder as any)['test-obj-element']({ data: obj });
      });

      const el = container.firstElementChild as HTMLElement & { data: object | null };
      Object.defineProperty(el, 'data', {
        get() {
          return obj;
        },
        set(_v) {
          assignCount++;
        },
        configurable: true,
      });

      builder.build(container, () => {
        (builder as any)['test-obj-element']({ data: obj });
      });

      expect(assignCount).to.equal(0);
      container.remove();
    });

    it('removes object property by setting null when prop is dropped', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      const obj = { value: 'hello' };

      builder.build(container, () => {
        (builder as any)['test-obj-element']({ data: obj });
      });
      const el = container.firstElementChild as HTMLElement & { data: object | null };
      expect(el.data).to.equal(obj);

      builder.build(container, () => {
        (builder as any)['test-obj-element']({});
      });
      expect(el.data).to.be.null;

      container.remove();
    });

    it('sets array property via DOM property assignment', () => {
      const arr = [1, 2, 3];
      const el = (builder as any)['test-obj-element']({ items: arr }) as HTMLElement & {
        items: unknown[] | null;
      };
      expect(el.items).to.equal(arr);
      expect(el.getAttribute('items')).to.be.null;
    });
  });

  describe('text shorthand prop', () => {
    it('"text" prop sets textContent', () => {
      const el = builder.span({ text: 'hello' } as any);
      expect(el.textContent).to.equal('hello');
    });

    it('"text" and "textContent" are equivalent', () => {
      const a = builder.span({ text: 'same' } as any);
      const b = builder.span({ textContent: 'same' });
      expect(a.textContent).to.equal(b.textContent);
    });
  });

  describe('detached()', () => {
    it('creates element outside the current build context', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      let detachedEl: HTMLElement | null = null;

      builder.build(container, () => {
        builder.div({ textContent: 'in context' });
        detachedEl = builder.detached(() =>
          builder.span({ textContent: 'detached' }),
        ) as HTMLElement;
        builder.div({ textContent: 'also in context' });
      });

      // The detached element was not appended to the container
      expect(container.children.length).to.equal(2);
      expect(detachedEl).to.be.instanceOf(HTMLSpanElement);
      expect(detachedEl!.textContent).to.equal('detached');
      expect(detachedEl!.parentNode).to.be.null;

      container.remove();
    });

    it('restores the outer build context after detached()', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      builder.build(container, () => {
        builder.div({ textContent: 'before' });
        builder.detached(() => builder.span());
        builder.div({ textContent: 'after' });
      });

      expect(container.children.length).to.equal(2);
      expect(container.children[0].textContent).to.equal('before');
      expect(container.children[1].textContent).to.equal('after');

      container.remove();
    });

    it('returns the value produced by the callback', () => {
      const result = builder.detached(() => 42);
      expect(result).to.equal(42);
    });
  });
});
