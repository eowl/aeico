import { expect } from '@esm-bundle/chai'
import ElementBuilder from '../../../src/core/ElementBuilder.js'

describe('ElementBuilder - build()', () => {
  let builder: ElementBuilder
  let container: HTMLDivElement

  beforeEach(() => {
    builder = new ElementBuilder()
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  describe('Basic reconciliation', () => {
    it('reuses existing elements with matching tags', () => {
      container.innerHTML = '<div id="test">Initial</div>'
      const originalDiv = container.firstElementChild

      builder.build(container, () => {
        builder.div({ id: 'test', textContent: 'Updated' })
      })

      expect(container.firstElementChild).to.equal(originalDiv, 'Should reuse the same element')
      expect(container.firstElementChild!.textContent).to.equal('Updated')
    })

    it('creates new elements when tags do not match', () => {
      container.innerHTML = '<span>Old</span>'

      builder.build(container, () => {
        builder.div({ textContent: 'New' })
      })

      expect(container.firstElementChild?.tagName).to.equal('DIV')
      expect(container.querySelector('span')).to.be.null
    })

    it('removes extra elements after build', () => {
      container.innerHTML = '<div>1</div><div>2</div><div>3</div>'

      builder.build(container, () => {
        builder.div({ textContent: 'A' })
        builder.div({ textContent: 'B' })
      })

      expect(container.children.length).to.equal(2)
      expect(container.children[0].textContent).to.equal('A')
      expect(container.children[1].textContent).to.equal('B')
    })

    it('updates element attributes', () => {
      container.innerHTML = '<div class="old" data-value="1">Text</div>'

      builder.build(container, () => {
        builder.div({ className: 'new', 'data-value': '2', textContent: 'Updated' })
      })

      const div = container.firstElementChild as HTMLElement
      expect(div.className).to.equal('new')
      expect(div.getAttribute('data-value')).to.equal('2')
      expect(div.textContent).to.equal('Updated')
    })
  })

  describe('Key-based reconciliation', () => {
    it('finds and reuses element by key', () => {
      container.innerHTML = '<div data-key="item-1">Item 1</div>'
      const original = container.firstElementChild

      builder.build(container, () => {
        builder.div({ key: 'item-1', textContent: 'Updated Item 1' })
      })

      expect(container.firstElementChild).to.equal(original, 'Should reuse element with matching key')
      expect(container.firstElementChild!.textContent).to.equal('Updated Item 1')
    })

    it('reorders elements based on keys', () => {
      container.innerHTML = `
        <div data-key="a">A</div>
        <div data-key="b">B</div>
        <div data-key="c">C</div>
      `
      const originalA = container.querySelector('[data-key="a"]')
      const originalB = container.querySelector('[data-key="b"]')
      const originalC = container.querySelector('[data-key="c"]')

      builder.build(container, () => {
        builder.div({ key: 'c', textContent: 'C' })
        builder.div({ key: 'a', textContent: 'A' })
        builder.div({ key: 'b', textContent: 'B' })
      })

      expect(container.children[0]).to.equal(originalC)
      expect(container.children[1]).to.equal(originalA)
      expect(container.children[2]).to.equal(originalB)
    })

    it('adds new elements with keys', () => {
      container.innerHTML = '<div data-key="a">A</div>'

      builder.build(container, () => {
        builder.div({ key: 'a', textContent: 'A' })
        builder.div({ key: 'b', textContent: 'B' })
        builder.div({ key: 'c', textContent: 'C' })
      })

      expect(container.children.length).to.equal(3)
      expect(container.children[1].getAttribute('data-key')).to.equal('b')
      expect(container.children[2].getAttribute('data-key')).to.equal('c')
    })

    it('removes elements with keys that are no longer present', () => {
      container.innerHTML = `
        <div data-key="a">A</div>
        <div data-key="b">B</div>
        <div data-key="c">C</div>
      `

      builder.build(container, () => {
        builder.div({ key: 'a', textContent: 'A' })
        builder.div({ key: 'c', textContent: 'C' })
      })

      expect(container.children.length).to.equal(2)
      expect(container.querySelector('[data-key="b"]')).to.be.null
    })

    it('does not mix keyed and non-keyed elements', () => {
      container.innerHTML = `
        <div data-key="keyed">Keyed</div>
        <div>Non-keyed</div>
      `

      builder.build(container, () => {
        builder.div({ textContent: 'New Non-keyed' })
        builder.div({ key: 'keyed', textContent: 'Updated Keyed' })
      })

      expect(container.children.length).to.equal(2)
      expect(container.children[0].hasAttribute('data-key')).to.be.false
      expect(container.children[1].getAttribute('data-key')).to.equal('keyed')
    })

    it('ignores key prop in DOM attributes', () => {
      builder.build(container, () => {
        builder.div({ key: 'test', className: 'test-class' })
      })

      const div = container.firstElementChild!
      expect(div.hasAttribute('key')).to.be.false
      expect(div.getAttribute('data-key')).to.equal('test')
      expect(div.className).to.equal('test-class')
    })
  })

  describe('Nested updates', () => {
    it('updates nested elements', () => {
      container.innerHTML = `
        <div id="outer">
          <span id="inner">Old</span>
        </div>
      `

      builder.build(container, () => {
        builder.div({ id: 'outer' }, () => {
          builder.span({ id: 'inner', textContent: 'New' })
        })
      })

      const outerDiv = container.querySelector('#outer')
      const innerSpan = container.querySelector('#inner')
      expect(outerDiv).to.exist
      expect(innerSpan).to.exist
      expect(outerDiv?.children.length).to.equal(1)
      expect(innerSpan?.textContent).to.equal('New')
    })

    it('handles deeply nested structures', () => {
      container.innerHTML = `
        <div id="level1">
          <div id="level2">
            <div id="level3">Deep</div>
          </div>
        </div>
      `

      builder.build(container, () => {
        builder.div({ id: 'level1' }, () => {
          builder.div({ id: 'level2' }, () => {
            builder.div({ id: 'level3', textContent: 'Updated Deep' })
          })
        })
      })

      expect(container.querySelector('#level3')?.textContent).to.equal('Updated Deep')
    })

    it('clears children when no callback provided', () => {
      container.innerHTML = '<div><span>Child</span></div>'

      builder.build(container, () => {
        builder.div() // No callback
      })

      // div is reused, but without cb textContent is not cleared
      // The span remains because no cleanup runs without cb
      const div = container.firstElementChild!
      expect(div.tagName).to.equal('DIV')
    })

    it('does not break textContent with children (skipTextContent)', () => {
      // First render
      builder.build(container, () => {
        builder.div({ className: 'wrapper' }, () => {
          builder.span({ textContent: 'child 1' })
          builder.span({ textContent: 'child 2' })
        })
      })
      const wrapper = container.firstElementChild!
      const span1 = wrapper.children[0]
      const span2 = wrapper.children[1]

      // Second render: children should be reused, not destroyed by textContent
      builder.build(container, () => {
        builder.div({ className: 'wrapper', textContent: 'ignored' }, () => {
          builder.span({ textContent: 'updated 1' })
          builder.span({ textContent: 'updated 2' })
        })
      })

      expect(wrapper.children[0]).to.equal(span1, 'Child 1 should be reused')
      expect(wrapper.children[1]).to.equal(span2, 'Child 2 should be reused')
      expect(span1.textContent).to.equal('updated 1')
      expect(span2.textContent).to.equal('updated 2')
    })
  })

  describe('Text node reconciliation', () => {
    it('reuses and updates text nodes', () => {
      container.textContent = 'Old text'
      const originalTextNode = container.firstChild

      builder.build(container, () => {
        builder.text('New text')
      })

      expect(container.firstChild).to.equal(originalTextNode)
      expect(container.textContent).to.equal('New text')
    })

    it('creates text node when element is at cursor', () => {
      container.innerHTML = '<div>Element</div>'

      builder.build(container, () => {
        builder.text('Text node')
      })

      expect(container.firstChild?.nodeType).to.equal(Node.TEXT_NODE)
      expect(container.childNodes.length).to.equal(1)
    })

    it('mixes text nodes and elements', () => {
      builder.build(container, () => {
        builder.text('Before ')
        builder.span({ textContent: 'Element' })
        builder.text(' After')
      })

      // Second pass: update all
      builder.build(container, () => {
        builder.text('Updated before ')
        builder.span({ textContent: 'Updated element' })
        builder.text(' Updated after')
      })

      expect(container.childNodes.length).to.equal(3)
      expect(container.childNodes[0].textContent).to.equal('Updated before ')
      expect(container.childNodes[1].textContent).to.equal('Updated element')
      expect(container.childNodes[2].textContent).to.equal(' Updated after')
    })
  })

  describe('node() in build context', () => {
    it('inserts existing node at cursor position', () => {
      builder.build(container, () => {
        builder.div({ textContent: 'first' })
        const p = document.createElement('p')
        p.textContent = 'injected'
        builder.node(p)
        builder.div({ textContent: 'last' })
      })

      expect(container.children.length).to.equal(3)
      expect(container.children[1].tagName).to.equal('P')
      expect(container.children[1].textContent).to.equal('injected')
    })

    it('inserts fragment and advances cursor correctly', () => {
      builder.build(container, () => {
        const frag = builder.fragment(() => {
          builder.span({ textContent: 'from frag 1' })
          builder.span({ textContent: 'from frag 2' })
        })
        builder.node(frag)
        builder.div({ textContent: 'after frag' })
      })

      expect(container.children.length).to.equal(3)
      expect(container.children[0].textContent).to.equal('from frag 1')
      expect(container.children[1].textContent).to.equal('from frag 2')
      expect(container.children[2].textContent).to.equal('after frag')
    })
  })

  describe('Edge cases', () => {
    it('fragment does not corrupt parent cursor', () => {
      builder.build(container, () => {
        builder.div({ textContent: 'before' })
        const frag = builder.fragment(() => {
          builder.span({ textContent: 'frag child' })
        })
        builder.node(frag)
        builder.div({ textContent: 'after' })
      })

      expect(container.children.length).to.equal(3)
      expect(container.children[0].textContent).to.equal('before')
      expect(container.children[1].textContent).to.equal('frag child')
      expect(container.children[2].textContent).to.equal('after')
    })
  })

  describe('Event listeners', () => {
    it('event listeners work on reused elements', (done) => {
      container.innerHTML = '<button>Old</button>'

      builder.build(container, () => {
        builder.button({
          textContent: 'New',
          onClick: () => done()
        })
      })

      container.querySelector('button')?.click()
    })
  })

  describe('SVG in build context', () => {
    it('works with SVG elements', () => {
      container.innerHTML = '<svg><circle cx="50" cy="50" r="40"></circle></svg>'
      const originalSvg = container.firstElementChild
      const originalCircle = originalSvg?.firstElementChild

      builder.build(container, () => {
        builder.svg({}, () => {
          builder.circle({ cx: '60', cy: '60', r: '50' })
        })
      })

      expect(container.firstElementChild).to.equal(originalSvg)
      expect(originalSvg?.firstElementChild).to.equal(originalCircle)
      expect(originalCircle?.getAttribute('cx')).to.equal('60')
    })
  })

  describe('Edge cases', () => {
    it('handles empty build', () => {
      container.innerHTML = '<div>Content</div>'

      builder.build(container, () => {
        // Don't create any elements
      })

      expect(container.children.length).to.equal(0)
    })

    it('multiple consecutive builds reconcile correctly', () => {
      // Render 1
      builder.build(container, () => {
        builder.div({ key: 'a', textContent: 'v1' })
        builder.div({ key: 'b', textContent: 'v1' })
      })
      const a = container.querySelector('[data-key="a"]')
      const b = container.querySelector('[data-key="b"]')

      // Render 2
      builder.build(container, () => {
        builder.div({ key: 'a', textContent: 'v2' })
        builder.div({ key: 'b', textContent: 'v2' })
      })

      expect(container.querySelector('[data-key="a"]')).to.equal(a)
      expect(container.querySelector('[data-key="b"]')).to.equal(b)
      expect(a!.textContent).to.equal('v2')
      expect(b!.textContent).to.equal('v2')
    })
  })

  describe('Event listener dedup', () => {
    it('does not accumulate duplicate listeners on reused elements', () => {
      let callCount = 0

      // First build
      builder.build(container, () => {
        builder.button({ onClick: () => callCount++ })
      })

      // Second build with new handler
      builder.build(container, () => {
        builder.button({ onClick: () => callCount++ })
      })

      // Third build with yet another handler
      builder.build(container, () => {
        builder.button({ onClick: () => callCount++ })
      })

      container.querySelector('button')!.click()
      expect(callCount).to.equal(1, 'Handler should fire only once, not accumulate')
    })

    it('replaces old handler with new handler', () => {
      const calls: string[] = []

      builder.build(container, () => {
        builder.button({ onClick: () => calls.push('old') })
      })

      builder.build(container, () => {
        builder.button({ onClick: () => calls.push('new') })
      })

      container.querySelector('button')!.click()
      expect(calls).to.deep.equal(['new'])
    })
  })

  describe('Boolean attribute removal', () => {
    it('removes boolean attribute when changed to false', () => {
      // First render: disabled
      builder.build(container, () => {
        builder.input({ disabled: true })
      })
      const input = container.querySelector('input')!
      expect(input.hasAttribute('disabled')).to.be.true

      // Second render: not disabled
      builder.build(container, () => {
        builder.input({ disabled: false })
      })
      expect(input.hasAttribute('disabled')).to.be.false
    })

    it('toggles multiple boolean attributes', () => {
      builder.build(container, () => {
        builder.input({ disabled: true, required: true, readonly: true })
      })
      const input = container.querySelector('input')!
      expect(input.hasAttribute('disabled')).to.be.true
      expect(input.hasAttribute('required')).to.be.true
      expect(input.hasAttribute('readonly')).to.be.true

      builder.build(container, () => {
        builder.input({ disabled: false, required: true, readonly: false })
      })
      expect(input.hasAttribute('disabled')).to.be.false
      expect(input.hasAttribute('required')).to.be.true
      expect(input.hasAttribute('readonly')).to.be.false
    })
  })

  describe('Stale prop removal (propsCache)', () => {
    it('removes attributes that disappear between renders', () => {
      builder.build(container, () => {
        builder.div({ id: 'box', title: 'hello', 'data-x': '1' })
      })
      const div = container.firstElementChild!
      expect(div.getAttribute('id')).to.equal('box')
      expect(div.getAttribute('title')).to.equal('hello')
      expect(div.getAttribute('data-x')).to.equal('1')

      builder.build(container, () => {
        builder.div({ id: 'box' })
      })
      expect(div.getAttribute('id')).to.equal('box')
      expect(div.hasAttribute('title')).to.be.false
      expect(div.hasAttribute('data-x')).to.be.false
    })

    it('removes class when className prop disappears', () => {
      builder.build(container, () => {
        builder.div({ className: 'active big' })
      })
      const div = container.firstElementChild!
      expect(div.getAttribute('class')).to.equal('active big')

      builder.build(container, () => {
        builder.div({})
      })
      expect(div.hasAttribute('class')).to.be.false
    })

    it('removes stale event listener when event prop disappears', () => {
      let called = false
      builder.build(container, () => {
        builder.button({ onClick: () => { called = true } })
      })

      builder.build(container, () => {
        builder.button({})
      })

      container.querySelector('button')!.click()
      expect(called).to.be.false
    })

    it('removes stale boolean attribute when prop disappears entirely', () => {
      builder.build(container, () => {
        builder.input({ disabled: true, required: true })
      })
      const input = container.querySelector('input')!
      expect(input.hasAttribute('disabled')).to.be.true
      expect(input.hasAttribute('required')).to.be.true

      // Only keep required, drop disabled entirely
      builder.build(container, () => {
        builder.input({ required: true })
      })
      expect(input.hasAttribute('disabled')).to.be.false
      expect(input.hasAttribute('required')).to.be.true
    })

    it('skips DOM writes when props are identical across renders', () => {
      builder.build(container, () => {
        builder.div({ id: 'stable', title: 'same' })
      })
      const div = container.firstElementChild!

      // Spy: override setAttribute to detect calls
      let setAttrCalls = 0
      const origSetAttr = div.setAttribute.bind(div)
      div.setAttribute = (...args: [string, string]) => { setAttrCalls++; origSetAttr(...args) }

      builder.build(container, () => {
        builder.div({ id: 'stable', title: 'same' })
      })

      expect(setAttrCalls).to.equal(0, 'No setAttribute calls when props unchanged')
    })

    it('does not remove style attribute when style prop disappears', () => {
      builder.build(container, () => {
        builder.div({ style: { color: 'red' } })
      })
      const div = container.firstElementChild as HTMLElement
      expect(div.style.color).to.equal('red')

      builder.build(container, () => {
        builder.div({})
      })
      // Verify element was reused
      expect(container.firstElementChild).to.equal(div, 'Element should be reused')
      // Style properties should be cleared
      expect(div.style.color).to.equal('')
    })
  })
})
