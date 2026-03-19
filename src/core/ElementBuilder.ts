type TagProps = {
  className?: string | Record<string, boolean>
  textContent?: string
  id?: string
  part?: string
  role?: string
  style?: Partial<CSSStyleDeclaration>
  [key: string]: any
}

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
  private stack: Node[] = []

  constructor() {
    return new Proxy(this, {
      get(target, prop: string) {
        if (prop in target) return (target as any)[prop]

        return (p?: any, cb?: any) => (target as any)._create(prop, p, cb)
      }
    })
  }

  private _create(
    tagName: string,
    props?: TagProps,
    cb?: () => void
  ): Element {
    const parent = this.stack[this.stack.length - 1]
    const isSVG = tagName === 'svg'
      || (parent instanceof Element && parent.namespaceURI === SVG_NS)

    const el = isSVG
      ? document.createElementNS(SVG_NS, tagName)
      : document.createElement(tagName)

    if (props) this._applyProps(el, props)
    if (parent) parent.appendChild(el)

    if (cb) {
      this.stack.push(el)
      cb()
      this.stack.pop()
    }

    return el
  }

  private _applyProps(el: Element, props: TagProps) {
    for (const [key, value] of Object.entries(props)) {
      if (value == null || value === false) continue
        
      if (key === 'className' || key === 'class') {
        const classValue = typeof value === 'object'
          ? Object.entries(value).filter(([_, active]) => active).map(([name]) => name).join(' ')
          : String(value)
        el.setAttribute('class', classValue)

        continue
      }

      if (key === 'textContent') {
        el.textContent = String(value)
        continue
      }

      if (key === 'style') {
        if (typeof value === 'object' && 'style' in el) Object.assign((el as HTMLElement).style, value)
        continue
      }

      if (typeof value === 'boolean') {
        if (value) el.setAttribute(key, '')
        continue
      }

      if (key.startsWith('on') && typeof value === 'function') {
        el.addEventListener(key.slice(2).toLowerCase(), value)
        continue
      }

      el.setAttribute(key, String(value))
    }
  }

  el = <T extends keyof HTMLElementTagNameMap | keyof SVGElementTagNameMap>(
    tagName: T,
    props?: TagProps,
    cb?: () => void
  ): T extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[T]
    : T extends keyof SVGElementTagNameMap ? SVGElementTagNameMap[T]
    : Element => {
    return this._create(tagName, props, cb) as any
  }

  text = (content: string): Text => {
    const textNode = document.createTextNode(content)
    const parent = this.stack[this.stack.length - 1]
    if (parent) parent.appendChild(textNode)

    return textNode
  }

  node = (existingNode: Node): Node => {
    const parent = this.stack[this.stack.length - 1]
    if (parent) parent.appendChild(existingNode)

    return existingNode
  }

  fragment = (cb: () => void): DocumentFragment => {
    const fragment = document.createDocumentFragment()
    this.stack.push(fragment)
    cb()
    this.stack.pop()

    return fragment
  }
}

export default ElementBuilder
export type { TagProps, HTMLTags, SVGOnlyTags }
