type _Props = {
  className?: string | Record<string, boolean>
  textContent?: string
  id?: string
  part?: string
  role?: string
  style?: Partial<CSSStyleDeclaration>
  key?: string
}

type TagProps = _Props & Record<string, unknown>

type TagFunction<K extends keyof HTMLElementTagNameMap> = 
  (props?: TagProps, cb?: () => void) => HTMLElementTagNameMap[K]

type HTMLTags = {
  readonly [K in keyof HTMLElementTagNameMap]: TagFunction<K>
}

type SVGTagFunction<K extends keyof SVGElementTagNameMap> = 
  (props?: TagProps, cb?: () => void) => SVGElementTagNameMap[K]

type SVGOnlyTags = {
  readonly [K in Exclude<keyof SVGElementTagNameMap, keyof HTMLElementTagNameMap | 'text'>]: SVGTagFunction<K>
}

const SVG_NS = 'http://www.w3.org/2000/svg'

interface ElementBuilder extends HTMLTags, SVGOnlyTags {}

class ElementBuilder {
  private _stack: Node[] = []
  private _cursorStack: number[] = []
  private _propsCache = new WeakMap<Element, Record<string, unknown>>()

  constructor() {
    return new Proxy(this, {
      get(target, prop: string) {
        if (prop in target) return Reflect.get(target, prop) as unknown
        
        return (p?: TagProps, cb?: () => void) => target._create(prop, p, cb)
      }
    })
  }

  private _create(tagName: string, props?: TagProps, cb?: () => void): Element {
    const parent = this._stack[this._stack.length - 1]

    if (!parent || this._cursorStack.length === 0 || this._isBareFragment(parent)) {
      return this._createFresh(tagName, props, cb)
    }

    const currentIndex = this._cursorStack[this._cursorStack.length - 1]
    const key = props?.key
    let el: Element | null = null

    if (key) {
      el = this._findChildByKey(parent, key, currentIndex)
      if (el) {
        // insertBefore moves el to currentIndex; the displaced node shifts right
        // and will be matched or cleaned up in subsequent iterations
        if (parent.childNodes[currentIndex] !== el) {
          parent.insertBefore(el, parent.childNodes[currentIndex])
        }
        if (el.tagName.toLowerCase() !== tagName.toLowerCase()) {
          el.remove()
          el = null
        }
      }
    } else {
      const nodeAtCursor = parent.childNodes[currentIndex] as Element
      if (
        nodeAtCursor &&
        nodeAtCursor.tagName?.toLowerCase() === tagName.toLowerCase() &&
        !nodeAtCursor.hasAttribute('data-key')
      ) {
        el = nodeAtCursor
      }
    }

    if (!el) {
      const isSVG = tagName === 'svg' || (parent instanceof Element && parent.namespaceURI === SVG_NS)
      el = isSVG ? document.createElementNS(SVG_NS, tagName) : document.createElement(tagName)
      if (key) el.setAttribute('data-key', key)
      parent.insertBefore(el, parent.childNodes[currentIndex] || null)
    }

    if (cb) {
      if (props) this._applyProps(el, props, true)
      this._stack.push(el)
      this._cursorStack.push(0)
      cb()
      this._cleanup(el, this._cursorStack[this._cursorStack.length - 1])
      this._cursorStack.pop()
      this._stack.pop()
    } else {
      if (props) this._applyProps(el, props)
    }

    this._cursorStack[this._cursorStack.length - 1]++

    return el
  }

  private _createFresh(tagName: string, props?: TagProps, cb?: () => void): Element {
    const parent = this._stack[this._stack.length - 1]
    const isSVG = tagName === 'svg'
      || (parent instanceof Element && parent.namespaceURI === SVG_NS)
    const el = isSVG
      ? document.createElementNS(SVG_NS, tagName)
      : document.createElement(tagName)

    if (cb) {
      if (props) this._applyProps(el, props, true)
      if (parent) parent.appendChild(el)
      this._stack.push(el)
      this._cursorStack.push(0)
      cb()
      this._cursorStack.pop()
      this._stack.pop()
    } else {
      if (props) this._applyProps(el, props)
      if (parent) parent.appendChild(el)
    }

    return el
  }

  private _findChildByKey(parent: Node, key: string, start: number): Element | null {
    for (let i = start; i < parent.childNodes.length; i++) {
      const child = parent.childNodes[i]
      if (child.nodeType === Node.ELEMENT_NODE && (child as Element).getAttribute('data-key') === key) {
        return child as Element
      }
    }
    
    return null
  }

  private _isBareFragment(node: Node): boolean {
    return node.nodeType === Node.DOCUMENT_FRAGMENT_NODE && !(node instanceof ShadowRoot)
  }

  public build(root: Node, block: () => void): void {
    this._stack = [root]
    this._cursorStack = [0]

    block()

    this._cleanup(root, this._cursorStack[0])

    this._stack = []
    this._cursorStack = []
  }

  private _cleanup(parent: Node, activeCount: number) {
    while (parent.childNodes.length > activeCount) {
      parent.removeChild(parent.lastChild!)
    }
  }

  private _applyProps(el: Element, props: TagProps, skipTextContent: boolean = false) {
    const oldCache = this._propsCache.get(el)
    const newCache: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(props)) {
      if (key === 'key') continue
      if (key === 'textContent' && skipTextContent) continue

      if (key === 'className' || key === 'class') {
        if (value == null || value === false) {
          newCache['class'] = null
        } else if (typeof value === 'object') {
          newCache['class'] = Object.entries(value as Record<string, boolean>)
            .filter(([_, a]) => a)
            .map(([n]) => n)
            .join(' ')
        } else {
          newCache['class'] = String(value as string | number | boolean | bigint)
        }

        continue
      }

      if (key.startsWith('on') && typeof value === 'function') {
        newCache[`on:${key.slice(2).toLowerCase()}`] = value
        continue
      }

      newCache[key] = value
    }

    for (const [ck, value] of Object.entries(newCache)) {
      if (oldCache && oldCache[ck] === value) continue

      if (value == null || value === false) {
        if (ck === 'class') el.removeAttribute('class')
        else if (ck === 'textContent') el.textContent = ''
        else if (!ck.startsWith('on:')) el.removeAttribute(ck)
        continue
      }

      if (ck === 'class') {
        el.setAttribute('class', value as string)
      } else if (ck === 'textContent') {
        el.textContent = value as string
      } else if (ck === 'style') {
        if (typeof value === 'object' && 'style' in el) Object.assign((el as HTMLElement).style, value)
      } else if (ck.startsWith('on:')) {
        const eventName = ck.slice(3)
        if (oldCache?.[ck]) el.removeEventListener(eventName, oldCache[ck] as EventListener)
        el.addEventListener(eventName, value as EventListener)
      } else if (typeof value === 'boolean') {
        el.setAttribute(ck, '')
      } else {
        el.setAttribute(ck, String(value as string | number | bigint))
      }
    }

    if (oldCache) {
      for (const [ck, oldValue] of Object.entries(oldCache)) {
        if (ck in newCache) continue
        if (ck === 'class') el.removeAttribute('class')
        else if (ck === 'textContent') { if (!skipTextContent) el.textContent = '' }
        else if (ck === 'style' && 'style' in el) (el as HTMLElement).style.cssText = ''
        else if (ck.startsWith('on:') && typeof oldValue === 'function') el.removeEventListener(ck.slice(3), oldValue as EventListener)
        else el.removeAttribute(ck)
      }
    }

    this._propsCache.set(el, newCache)
  }

  el = <T extends keyof HTMLElementTagNameMap | keyof SVGElementTagNameMap>(
    tagName: T,
    props?: TagProps,
    cb?: () => void
  ): T extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[T]
    : T extends keyof SVGElementTagNameMap ? SVGElementTagNameMap[T]
    : Element => {
    return this._create(tagName, props, cb) as unknown as T extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[T] : T extends keyof SVGElementTagNameMap ? SVGElementTagNameMap[T] : Element
  }

  text = (content: string): Text => {
    const parent = this._stack[this._stack.length - 1]
    const inBuildContext = parent && this._cursorStack.length > 0 && !this._isBareFragment(parent)

    if (inBuildContext) {
      const cursor = this._cursorStack[this._cursorStack.length - 1]
      const nodeAtCursor = parent.childNodes[cursor]
      let textNode: Text

      if (nodeAtCursor?.nodeType === Node.TEXT_NODE) {
        textNode = nodeAtCursor as Text
        if (textNode.textContent !== content) textNode.textContent = content
      } else {
        textNode = document.createTextNode(content)
        parent.insertBefore(textNode, nodeAtCursor || null)
      }

      this._cursorStack[this._cursorStack.length - 1]++

      return textNode
    }

    const textNode = document.createTextNode(content)
    if (parent) parent.appendChild(textNode)

    return textNode
  }

  node = (existingNode: Node): Node => {
    const parent = this._stack[this._stack.length - 1]
    if (!parent) return existingNode

    const inBuildContext = this._cursorStack.length > 0 && !this._isBareFragment(parent)

    if (inBuildContext) {
      const cursor = this._cursorStack[this._cursorStack.length - 1]
      const ref = parent.childNodes[cursor] || null
      const count = existingNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE
        ? existingNode.childNodes.length
        : 1

      if (ref !== existingNode) {
        parent.insertBefore(existingNode, ref)
      }
      this._cursorStack[this._cursorStack.length - 1] += count
    } else {
      parent.appendChild(existingNode)
    }

    return existingNode
  }

  fragment = (cb: () => void): DocumentFragment => {
    const fragment = document.createDocumentFragment()
    this._stack.push(fragment)
    cb()
    this._stack.pop()

    return fragment
  }
}

export default ElementBuilder
export type { TagProps, HTMLTags, SVGOnlyTags }
