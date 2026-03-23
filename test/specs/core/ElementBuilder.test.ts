import { expect } from '@esm-bundle/chai'
import ElementBuilder from '../../../src/core/ElementBuilder.js'

describe('ElementBuilder', () => {
  let builder: ElementBuilder

  const SVG_NS = 'http://www.w3.org/2000/svg'

  beforeEach(() => {
    builder = new ElementBuilder()
  })

  describe('HTML element creation', () => {
    it('creates elements with different tag names', () => {
      const div = builder.div()
      const span = builder.span()
      const button = builder.button()
      
      expect(div.tagName).to.equal('DIV')
      expect(span.tagName).to.equal('SPAN')
      expect(button.tagName).to.equal('BUTTON')
    })

    it('creates an anchor element with href', () => {
      const anchor = builder.a({ href: 'https://example.com' })
      expect(anchor).to.be.instanceOf(HTMLAnchorElement)
      expect(anchor.href).to.equal('https://example.com/')
    })

    it('creates input elements with type attribute', () => {
      const input = builder.input({ type: 'checkbox' })
      expect(input).to.be.instanceOf(HTMLInputElement)
      expect(input.type).to.equal('checkbox')
    })
  })

  describe('SVG element creation', () => {
    it('creates an svg element with proper namespace', () => {
      const svg = builder.svg()
      expect(svg).to.be.instanceOf(SVGSVGElement)
      expect(svg.namespaceURI).to.equal(SVG_NS)
    })

    it('creates nested SVG elements with proper namespace', () => {
      const svg = builder.svg({}, () => {
        builder.circle({ cx: '50', cy: '50', r: '40' })
        builder.rect({ x: '10', y: '10', width: '80', height: '80' })
      })

      const circle = svg.querySelector('circle')
      const rect = svg.querySelector('rect')

      expect(circle).to.be.instanceOf(SVGCircleElement)
      expect(rect).to.be.instanceOf(SVGRectElement)
      expect(circle?.namespaceURI).to.equal(SVG_NS)
      expect(rect?.namespaceURI).to.equal(SVG_NS)
    })

    it('creates path element with proper namespace', () => {
      const svg = builder.svg({}, () => {
        builder.path({ d: 'M10 10 H 90 V 90 H 10 Z' })
      })

      const path = svg.querySelector('path')
      expect(path).to.be.instanceOf(SVGPathElement)
      expect(path?.namespaceURI).to.equal(SVG_NS)
    })
  })

  describe('Property application', () => {
    describe('className', () => {
      it('sets className from string', () => {
        const el = builder.div({ className: 'foo bar' })
        expect(el.className).to.equal('foo bar')
      })

      it('sets class from string using "class" key', () => {
        const el = builder.div({ class: 'baz qux' })
        expect(el.className).to.equal('baz qux')
      })

      it('sets className from object with active classes', () => {
        const el = builder.div({
          className: {
            'active': true,
            'disabled': false,
            'selected': true,
          }
        })
        expect(el.className).to.equal('active selected')
      })

      it('handles empty className object', () => {
        const el = builder.div({
          className: {
            'disabled': false,
            'hidden': false,
          }
        })
        expect(el.className).to.equal('')
      })
    })

    describe('textContent', () => {
      it('sets textContent from string', () => {
        const el = builder.div({ textContent: 'Hello World' })
        expect(el.textContent).to.equal('Hello World')
      })

      it('sets textContent from number', () => {
        const el = builder.span({ textContent: 42 as any })
        expect(el.textContent).to.equal('42')
      })
    })

    describe('id and common attributes', () => {
      it('sets id, part, role, and aria attributes', () => {
        const el = builder.button({
          id: 'my-element',
          part: 'container',
          role: 'tab',
          'aria-label': 'Close',
          'aria-expanded': 'false'
        })
        expect(el.id).to.equal('my-element')
        expect(el.getAttribute('part')).to.equal('container')
        expect(el.getAttribute('role')).to.equal('tab')
        expect(el.getAttribute('aria-label')).to.equal('Close')
        expect(el.getAttribute('aria-expanded')).to.equal('false')
      })
    })

    describe('style', () => {
      it('sets style from object', () => {
        const el = builder.div({
          style: {
            color: 'red',
            backgroundColor: 'blue',
            fontSize: '16px',
          }
        })
        expect(el.style.color).to.equal('red')
        expect(el.style.backgroundColor).to.equal('blue')
        expect(el.style.fontSize).to.equal('16px')
      })

      it('handles empty style object', () => {
        const el = builder.div({ style: {} })
        expect(el.style.cssText).to.equal('')
      })
    })

    describe('boolean attributes', () => {
      it('sets boolean attribute when true', () => {
        const el = builder.input({ disabled: true })
        expect(el.hasAttribute('disabled')).to.be.true
        expect(el.getAttribute('disabled')).to.equal('')
      })

      it('does not set boolean attribute when false', () => {
        const el = builder.input({ disabled: false })
        expect(el.hasAttribute('disabled')).to.be.false
      })

      it('handles multiple boolean attributes', () => {
        const el = builder.input({
          disabled: true,
          required: true,
          readonly: false,
        })
        expect(el.hasAttribute('disabled')).to.be.true
        expect(el.hasAttribute('required')).to.be.true
        expect(el.hasAttribute('readonly')).to.be.false
      })
    })

    describe('event listeners', () => {
      it('attaches click event listener', (done) => {
        const el = builder.button({
          onClick: (e: Event) => {
            expect(e.type).to.equal('click')
            done()
          }
        })
        el.click()
      })

      it('attaches input event listener', (done) => {
        const el = builder.input({
          onInput: (e: Event) => {
            expect(e.type).to.equal('input')
            done()
          }
        })
        el.dispatchEvent(new Event('input', { bubbles: true }))
      })

      it('attaches change event listener', (done) => {
        const el = builder.select({
          onChange: (e: Event) => {
            expect(e.type).to.equal('change')
            done()
          }
        })
        el.dispatchEvent(new Event('change', { bubbles: true }))
      })

      it('converts event name to lowercase', (done) => {
        const el = builder.div({
          onMouseOver: (e: Event) => {
            expect(e.type).to.equal('mouseover')
            done()
          }
        })
        el.dispatchEvent(new Event('mouseover', { bubbles: true }))
      })
    })

    describe('null and undefined handling', () => {
      it('ignores null, undefined and false values', () => {
        const el = builder.div({
          title: null as any,
          'data-a': undefined,
          'data-b': false as any,
          id: 'test',
        })
        expect(el.hasAttribute('title')).to.be.false
        expect(el.hasAttribute('data-a')).to.be.false
        expect(el.hasAttribute('data-b')).to.be.false
        expect(el.id).to.equal('test')
      })
    })

    describe('custom attributes', () => {
      it('sets data attributes', () => {
        const el = builder.div({
          'data-id': '123',
          'data-name': 'test',
        })
        expect(el.getAttribute('data-id')).to.equal('123')
        expect(el.getAttribute('data-name')).to.equal('test')
      })

      it('sets any custom attribute', () => {
        const el = builder.div({
          'custom-attr': 'value',
          'x-data': 'some-data',
        })
        expect(el.getAttribute('custom-attr')).to.equal('value')
        expect(el.getAttribute('x-data')).to.equal('some-data')
      })
    })
  })

  describe('Nested elements (stack)', () => {
    it('creates nested elements using callback', () => {
      const parent = builder.div({}, () => {
        builder.span({ textContent: 'Child' })
      })

      expect(parent.children.length).to.equal(1)
      expect(parent.children[0].tagName).to.equal('SPAN')
      expect(parent.children[0].textContent).to.equal('Child')
    })

    it('creates deeply nested elements', () => {
      const root = builder.div({ id: 'root' }, () => {
        builder.section({ id: 'section' }, () => {
          builder.article({ id: 'article' }, () => {
            builder.p({ textContent: 'Deep content' })
          })
        })
      })

      const section = root.querySelector('#section')
      const article = section?.querySelector('#article')
      const p = article?.querySelector('p')

      expect(section).to.exist
      expect(article).to.exist
      expect(p?.textContent).to.equal('Deep content')
    })

    it('creates multiple siblings', () => {
      const parent = builder.ul({}, () => {
        builder.li({ textContent: 'Item 1' })
        builder.li({ textContent: 'Item 2' })
        builder.li({ textContent: 'Item 3' })
      })

      expect(parent.children.length).to.equal(3)
      expect(parent.children[0].textContent).to.equal('Item 1')
      expect(parent.children[1].textContent).to.equal('Item 2')
      expect(parent.children[2].textContent).to.equal('Item 3')
    })

    it('correctly restores stack after nested callback', () => {
      const first = builder.div({ id: 'first' }, () => {
        builder.span({ textContent: 'Child of first' })
      })

      const second = builder.div({ id: 'second' }, () => {
        builder.span({ textContent: 'Child of second' })
      })

      expect(first.children.length).to.equal(1)
      expect(first.children[0].textContent).to.equal('Child of first')
      expect(second.children.length).to.equal(1)
      expect(second.children[0].textContent).to.equal('Child of second')
    })

    it('handles complex nested structure', () => {
      const container = builder.div({ className: 'container' }, () => {
        builder.header({}, () => {
          builder.h1({ textContent: 'Title' })
          builder.nav({}, () => {
            builder.a({ href: '#home', textContent: 'Home' })
            builder.a({ href: '#about', textContent: 'About' })
          })
        })
        builder.main({}, () => {
          builder.p({ textContent: 'Content' })
        })
        builder.footer({}, () => {
          builder.p({ textContent: 'Footer' })
        })
      })

      expect(container.children.length).to.equal(3)
      expect(container.querySelector('header')).to.exist
      expect(container.querySelector('main')).to.exist
      expect(container.querySelector('footer')).to.exist
      expect(container.querySelectorAll('nav a').length).to.equal(2)
    })
  })

  describe('el() method', () => {
    it('creates element using el method', () => {
      const div = builder.el('div')
      expect(div).to.be.instanceOf(HTMLDivElement)
      expect(div.tagName).to.equal('DIV')
    })

    it('creates element with props using el method', () => {
      const button = builder.el('button', { id: 'btn', textContent: 'Click' })
      expect(button.id).to.equal('btn')
      expect(button.textContent).to.equal('Click')
    })

    it('creates nested elements using el method', () => {
      const parent = builder.el('div', {}, () => {
        builder.el('span', { textContent: 'Child' })
      })

      expect(parent.children.length).to.equal(1)
      expect(parent.children[0].tagName).to.equal('SPAN')
    })

    it('creates SVG element using el method', () => {
      const svg = builder.el('svg')
      expect(svg).to.be.instanceOf(SVGSVGElement)
      expect(svg.namespaceURI).to.equal('http://www.w3.org/2000/svg')
    })
  })

  describe('text() method', () => {
    it('appends text node to parent in stack', () => {
      const parent = builder.div({}, () => {
        builder.text('Text content')
      })

      expect(parent.childNodes.length).to.equal(1)
      expect(parent.childNodes[0]).to.be.instanceOf(Text)
      expect(parent.textContent).to.equal('Text content')
    })

    it('creates multiple text nodes', () => {
      const parent = builder.div({}, () => {
        builder.text('First ')
        builder.text('Second ')
        builder.text('Third')
      })

      expect(parent.childNodes.length).to.equal(3)
      expect(parent.textContent).to.equal('First Second Third')
    })

    it('mixes text nodes with element nodes', () => {
      const parent = builder.div({}, () => {
        builder.text('Before ')
        builder.strong({ textContent: 'bold' })
        builder.text(' after')
      })

      expect(parent.childNodes.length).to.equal(3)
      expect(parent.textContent).to.equal('Before bold after')
      expect(parent.querySelector('strong')?.textContent).to.equal('bold')
    })
  })

  describe('node() method', () => {
    it('appends existing nodes to parent', () => {
      const node1 = document.createElement('span')
      node1.textContent = 'Node 1'
      const node2 = document.createElement('span')
      node2.textContent = 'Node 2'

      const parent = builder.div({}, () => {
        builder.node(node1)
        builder.node(node2)
      })

      expect(parent.children.length).to.equal(2)
      expect(parent.children[0]).to.equal(node1)
      expect(parent.children[1]).to.equal(node2)
    })

    it('appends text node using node method', () => {
      const textNode = document.createTextNode('Text via node()')

      const parent = builder.div({}, () => {
        builder.node(textNode)
      })

      expect(parent.childNodes.length).to.equal(1)
      expect(parent.childNodes[0]).to.equal(textNode)
      expect(parent.textContent).to.equal('Text via node()')
    })

    it('returns the appended node', () => {
      const existingNode = document.createElement('p')
      builder.div({}, () => {
        const returned = builder.node(existingNode)
        expect(returned).to.equal(existingNode)
      })
    })
  })

  describe('fragment() method', () => {
    it('creates a document fragment', () => {
      const frag = builder.fragment(() => {
        builder.div({ textContent: 'In fragment' })
      })

      expect(frag).to.be.instanceOf(DocumentFragment)
      expect(frag.children.length).to.equal(1)
      expect(frag.children[0].textContent).to.equal('In fragment')
    })

    it('creates fragment with multiple elements', () => {
      const frag = builder.fragment(() => {
        builder.div({ textContent: 'First' })
        builder.span({ textContent: 'Second' })
        builder.p({ textContent: 'Third' })
      })

      expect(frag.children.length).to.equal(3)
      expect(frag.children[0].tagName).to.equal('DIV')
      expect(frag.children[1].tagName).to.equal('SPAN')
      expect(frag.children[2].tagName).to.equal('P')
    })

    it('creates fragment with nested elements', () => {
      const frag = builder.fragment(() => {
        builder.div({}, () => {
          builder.span({ textContent: 'Nested' })
        })
      })

      const div = frag.querySelector('div')
      expect(div?.children.length).to.equal(1)
      expect(div?.children[0].textContent).to.equal('Nested')
    })

    it('can append fragment to element', () => {
      const frag = builder.fragment(() => {
        builder.li({ textContent: 'Item 1' })
        builder.li({ textContent: 'Item 2' })
      })

      const list = builder.ul()
      list.appendChild(frag)

      expect(list.children.length).to.equal(2)
      expect(list.children[0].textContent).to.equal('Item 1')
      expect(list.children[1].textContent).to.equal('Item 2')
    })

  })

  describe('Complex scenarios', () => {
    it('builds a complete form', () => {
      const form = builder.form({ id: 'my-form', action: '/submit' }, () => {
        builder.div({ className: 'form-group' }, () => {
          builder.label({ for: 'name', textContent: 'Name:' })
          builder.input({ type: 'text', id: 'name', name: 'name', required: true })
        })
        
        builder.div({ className: 'form-group' }, () => {
          builder.label({ for: 'email', textContent: 'Email:' })
          builder.input({ type: 'email', id: 'email', name: 'email', required: true })
        })
        
        builder.button({ type: 'submit', textContent: 'Submit' })
      })

      expect(form.id).to.equal('my-form')
      expect(form.getAttribute('action')).to.equal('/submit')
      expect(form.querySelectorAll('.form-group').length).to.equal(2)
      expect(form.querySelectorAll('input').length).to.equal(2)
      expect(form.querySelector('button[type="submit"]')).to.exist
    })

    it('builds an SVG icon', () => {
      const icon = builder.svg({ 
        viewBox: '0 0 24 24',
        width: '24',
        height: '24',
        fill: 'currentColor'
      }, () => {
        builder.path({ d: 'M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z' })
      })

      expect(icon.getAttribute('viewBox')).to.equal('0 0 24 24')
      expect(icon.querySelector('path')).to.exist
      expect(icon.querySelector('path')?.getAttribute('d')).to.include('M12 2L2 7')
    })

    it('builds a table structure', () => {
      const table = builder.table({}, () => {
        builder.thead({}, () => {
          builder.tr({}, () => {
            builder.th({ textContent: 'Name' })
            builder.th({ textContent: 'Age' })
          })
        })
        builder.tbody({}, () => {
          builder.tr({}, () => {
            builder.td({ textContent: 'Alice' })
            builder.td({ textContent: '30' })
          })
          builder.tr({}, () => {
            builder.td({ textContent: 'Bob' })
            builder.td({ textContent: '25' })
          })
        })
      })

      expect(table.querySelector('thead')).to.exist
      expect(table.querySelector('tbody')).to.exist
      expect(table.querySelectorAll('th').length).to.equal(2)
      expect(table.querySelectorAll('tbody tr').length).to.equal(2)
    })
  })

  describe('Edge cases', () => {
    it('handles empty callback', () => {
      const el = builder.div({}, () => {})
      expect(el.children.length).to.equal(0)
    })

    it('handles no props or empty props', () => {
      const el1 = builder.div()
      const el2 = builder.div({})
      expect(el1.tagName).to.equal('DIV')
      expect(el1.attributes.length).to.equal(0)
      expect(el2.tagName).to.equal('DIV')
      expect(el2.attributes.length).to.equal(0)
    })

    it('creates element without parent in stack', () => {
      const el = builder.div({ textContent: 'Standalone' })
      expect(el.parentNode).to.be.null
    })

    it('handles special characters in textContent', () => {
      const el = builder.div({ textContent: '<script>alert("XSS")</script>' })
      expect(el.textContent).to.equal('<script>alert("XSS")</script>')
      expect(el.querySelector('script')).to.be.null
    })

    it('handles attribute values with special characters', () => {
      const el = builder.div({ 
        title: 'Quote " and apostrophe \' and <tag>',
        'data-value': '{"key": "value"}'
      })
      expect(el.getAttribute('title')).to.equal('Quote " and apostrophe \' and <tag>')
      expect(el.getAttribute('data-value')).to.equal('{"key": "value"}')
    })
  })
})
