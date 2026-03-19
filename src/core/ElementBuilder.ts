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
  (props?: TagProps, block?: () => void) => HTMLElementTagNameMap[K]

type HTMLTags = {
  readonly [K in keyof HTMLElementTagNameMap]: TagFunction<K>
}

interface ElementBuilder extends HTMLTags {}

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

  private _create<T extends keyof HTMLElementTagNameMap>(
    tagName: T,
    props?: TagProps,
    cb?: () => void
  ): HTMLElementTagNameMap[T] {
    const el = document.createElement(tagName)

    if (props) this._applyProps(el, props)

    const parent = this.stack[this.stack.length - 1]
    if (parent) parent.appendChild(el)

    if (cb) {
      this.stack.push(el)
      cb()
      this.stack.pop()
    }

    return el
  }

  private _applyProps(el: HTMLElement, props: TagProps) {
    for (const [key, value] of Object.entries(props)) {
      if (value == null || value === false) continue
        
      if (key === 'className' || key === 'class') {
        if (typeof value === 'object') {
          el.className = Object.entries(value)
            .filter(([_, active]) => active)
            .map(([name]) => name).join(' ')
        } else {
          el.className = String(value)
        }

        continue
      }

      if (key === 'textContent') {
        el.textContent = String(value)
        continue
      }

      if (key === 'style') {
        if (typeof value === 'object') Object.assign(el.style, value)
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

  el = <T extends keyof HTMLElementTagNameMap>(
    tagName: T,
    props?: TagProps,
    cb?: () => void
  ): HTMLElementTagNameMap[T] => {
    return this._create(tagName, props, cb)
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
export type { TagProps, HTMLTags }
