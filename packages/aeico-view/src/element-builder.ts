const SVG_NS = 'http://www.w3.org/2000/svg';
import { camelToKebab } from './utils';

type _Style = Partial<CSSStyleDeclaration> & Record<string, string>;

type _Props = {
  className?: string | Record<string, boolean>;
  text?: string;
  textContent?: string;
  id?: string;
  part?: string;
  role?: string;
  style?: _Style;
  key?: string;
};

type BuilderProps = _Props & Record<string, unknown>;

type TagFunction<K extends keyof HTMLElementTagNameMap> = {
  (props?: BuilderProps, cb?: () => void): HTMLElementTagNameMap[K];
  (cb: () => void): HTMLElementTagNameMap[K];
};

type HTMLTags = {
  readonly [K in keyof HTMLElementTagNameMap]: TagFunction<K>;
};

type SVGTagFunction<K extends keyof SVGElementTagNameMap> = {
  (props?: BuilderProps, cb?: () => void): SVGElementTagNameMap[K];
  (cb: () => void): SVGElementTagNameMap[K];
};

type SVGOnlyTags = {
  readonly [K in Exclude<
    keyof SVGElementTagNameMap,
    keyof HTMLElementTagNameMap | 'text'
  >]: SVGTagFunction<K>;
};

type KebabToCamel<S extends string> = S extends `${infer Head}-${infer Tail}`
  ? `${Head}${Capitalize<KebabToCamel<Tail>>}`
  : S;

type CustomHTMLTags = {
  readonly [K in keyof HTMLElementTagNameMap as K extends `${string}-${string}`
    ? KebabToCamel<K>
    : never]: {
    (props?: BuilderProps, cb?: () => void): HTMLElementTagNameMap[K];
    (cb: () => void): HTMLElementTagNameMap[K];
  };
};

interface ElementBuilder extends HTMLTags, SVGOnlyTags, CustomHTMLTags {}

class ElementBuilder {
  private _stack: Node[] = [];
  private _cursorStack: number[] = [];
  private _propsCache = new WeakMap<Element, Record<string, unknown>>();

  constructor() {
    return new Proxy(this, {
      get(target, prop: string) {
        if (prop in target) return Reflect.get(target, prop) as unknown;

        const tagName = /[A-Z]/.test(prop) ? camelToKebab(prop) : prop;
        return (p?: BuilderProps | (() => void), cb?: () => void) => {
          if (typeof p === 'function') return target._create(tagName, undefined, p);
          return target._create(tagName, p, cb);
        };
      },
    });
  }

  private get _parent(): Node | undefined {
    return this._stack[this._stack.length - 1];
  }

  private get _cursor(): number {
    return this._cursorStack[this._cursorStack.length - 1];
  }

  private set _cursor(value: number) {
    this._cursorStack[this._cursorStack.length - 1] = value;
  }

  private get _inBuildContext(): boolean {
    return !!this._parent && this._cursorStack.length > 0 && !this._isBareFragment(this._parent);
  }

  private _create(tagName: string, props?: BuilderProps, cb?: () => void): Element {
    const parent = this._parent;

    const el = this._inBuildContext
      ? this._resolveElement(parent!, tagName, props?.key)
      : this._createElement(tagName, parent);

    this._mountChildren(el, parent, props, cb);

    if (this._inBuildContext) this._cursor++;

    return el;
  }

  private _createElement(tagName: string, parent?: Node): Element {
    const isSVG =
      tagName === 'svg' || (parent instanceof Element && parent.namespaceURI === SVG_NS);
    return isSVG ? document.createElementNS(SVG_NS, tagName) : document.createElement(tagName);
  }

  private _resolveElement(parent: Node, tagName: string, key?: string): Element {
    const cursor = this._cursor;
    let el: Element | null = null;

    if (key) {
      el = this._findChildByKey(parent, key, cursor);
      if (el) {
        if (parent.childNodes[cursor] !== el) {
          parent.insertBefore(el, parent.childNodes[cursor]);
        }
        if (el.tagName.toLowerCase() !== tagName.toLowerCase()) {
          el.remove();
          el = null;
        }
      }
    } else {
      const nodeAtCursor = parent.childNodes[cursor] as Element;
      if (
        nodeAtCursor &&
        nodeAtCursor.tagName?.toLowerCase() === tagName.toLowerCase() &&
        !nodeAtCursor.hasAttribute('data-key')
      ) {
        el = nodeAtCursor;
      }
    }

    if (!el) {
      el = this._createElement(tagName, parent);
      if (key) el.setAttribute('data-key', key);
      parent.insertBefore(el, parent.childNodes[cursor] || null);
    }

    return el;
  }

  private _mountChildren(
    el: Element,
    parent: Node | undefined,
    props?: BuilderProps,
    cb?: () => void,
  ): void {
    if (cb) {
      if (props) this._applyProps(el, props, true);
      if (parent && !el.parentNode) parent.appendChild(el);
      this._stack.push(el);
      this._cursorStack.push(0);
      cb();
      this._cleanup(el, this._cursor);
      this._cursorStack.pop();
      this._stack.pop();
    } else {
      if (props) this._applyProps(el, props);
      if (parent && !el.parentNode) parent.appendChild(el);
    }
  }

  private _findChildByKey(parent: Node, key: string, start: number): Element | null {
    for (let i = start; i < parent.childNodes.length; i++) {
      const child = parent.childNodes[i];
      if (
        child.nodeType === Node.ELEMENT_NODE &&
        (child as Element).getAttribute('data-key') === key
      ) {
        return child as Element;
      }
    }

    return null;
  }

  private _isBareFragment(node: Node): boolean {
    return node.nodeType === Node.DOCUMENT_FRAGMENT_NODE && !(node instanceof ShadowRoot);
  }

  public build(root: Node, block: () => void): void {
    this._stack = [root];
    this._cursorStack = [0];

    block();

    this._cleanup(root, this._cursorStack[0]);

    this._stack = [];
    this._cursorStack = [];
  }

  private _cleanup(parent: Node, activeCount: number) {
    while (parent.childNodes.length > activeCount) {
      parent.removeChild(parent.lastChild!);
    }
  }

  private _applyProps(el: Element, props: BuilderProps, skipTextContent: boolean = false) {
    const oldCache = this._propsCache.get(el);
    const newCache = this._normalizeProps(props, skipTextContent);

    // Apply changed props
    for (const [ck, value] of Object.entries(newCache)) {
      if (oldCache && oldCache[ck] === value) continue;

      if (value == null || value === false) {
        this._removeProp(el, ck);
        continue;
      }

      if (ck === 'class') {
        el.setAttribute('class', value as string);
      } else if (ck === 'textContent') {
        el.textContent = value as string;
      } else if (ck === 'style') {
        if (typeof value === 'object' && 'style' in el) {
          const s = (el as HTMLElement).style;
          for (const [k, v] of Object.entries(value as Record<string, string>)) {
            if (k.startsWith('--')) s.setProperty(k, v);
            else (s as unknown as Record<string, string>)[k] = v;
          }
        }
      } else if (ck.startsWith('@')) {
        const eventName = ck.slice(1);
        if (oldCache?.[ck]) el.removeEventListener(eventName, oldCache[ck] as EventListener);
        el.addEventListener(eventName, value as EventListener);
      } else if (typeof value === 'boolean') {
        el.setAttribute(ck, '');
      } else if (typeof value === 'object') {
        (el as unknown as Record<string, unknown>)[ck] = value;
      } else {
        el.setAttribute(ck, String(value as string | number | bigint));
      }
    }

    // Remove stale props
    if (oldCache) {
      for (const [ck, oldValue] of Object.entries(oldCache)) {
        if (ck in newCache) continue;
        if (ck === 'textContent' && skipTextContent) continue;
        if (ck.startsWith('@') && typeof oldValue === 'function') {
          el.removeEventListener(ck.slice(1), oldValue as EventListener);
        } else if (
          ck === 'style' &&
          typeof oldValue === 'object' &&
          oldValue !== null &&
          'style' in el
        ) {
          const s = (el as HTMLElement).style;
          for (const k of Object.keys(oldValue as Record<string, string>)) {
            if (k.startsWith('--')) s.removeProperty(k);
            else (s as unknown as Record<string, string>)[k] = '';
          }
        } else if (typeof oldValue === 'object' && oldValue !== null) {
          (el as unknown as Record<string, unknown>)[ck] = null;
        } else {
          this._removeProp(el, ck);
        }
      }
    }

    this._propsCache.set(el, newCache);
  }

  private _normalizeProps(props: BuilderProps, skipTextContent: boolean): Record<string, unknown> {
    const cache: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(props)) {
      if (key === 'key') continue;

      // text → textContent shorthand
      if (key === 'text' || key === 'textContent') {
        if (!skipTextContent) cache['textContent'] = value;
        continue;
      }

      // className / class → normalized 'class'
      if (key === 'className' || key === 'class') {
        if (value == null || value === false) {
          cache['class'] = null;
        } else if (typeof value === 'object') {
          cache['class'] = Object.entries(value as Record<string, boolean>)
            .filter(([_, a]) => a)
            .map(([n]) => n)
            .join(' ');
        } else {
          cache['class'] = String(value as string | number | boolean | bigint);
        }
        continue;
      }

      // @event handlers → @eventname (no case conversion)
      if (key.startsWith('@') && typeof value === 'function') {
        cache[`@${key.slice(1)}`] = value;
        continue;
      }

      cache[key] = value;
    }

    return cache;
  }

  private _removeProp(el: Element, key: string): void {
    if (key === 'class') el.removeAttribute('class');
    else if (key === 'textContent') el.textContent = '';
    else if (key === 'style' && 'style' in el) (el as HTMLElement).style.cssText = '';
    else if (!key.startsWith('@')) el.removeAttribute(key);
  }

  detached<T>(fn: () => T): T {
    const savedStack = this._stack;
    const savedCursor = this._cursorStack;
    this._stack = [];
    this._cursorStack = [];

    try {
      return fn();
    } finally {
      this._stack = savedStack;
      this._cursorStack = savedCursor;
    }
  }

  el = <T extends keyof HTMLElementTagNameMap | keyof SVGElementTagNameMap>(
    tagName: T,
    propsOrCb?: BuilderProps | (() => void),
    cb?: () => void,
  ): T extends keyof HTMLElementTagNameMap
    ? HTMLElementTagNameMap[T]
    : T extends keyof SVGElementTagNameMap
      ? SVGElementTagNameMap[T]
      : Element => {
    const props = typeof propsOrCb === 'function' ? undefined : propsOrCb;
    const callback = typeof propsOrCb === 'function' ? propsOrCb : cb;
    return this._create(
      tagName,
      props,
      callback,
    ) as unknown as T extends keyof HTMLElementTagNameMap
      ? HTMLElementTagNameMap[T]
      : T extends keyof SVGElementTagNameMap
        ? SVGElementTagNameMap[T]
        : Element;
  };

  text = (content: string): Text => {
    const parent = this._parent;

    if (this._inBuildContext) {
      const nodeAtCursor = parent!.childNodes[this._cursor];
      let textNode: Text;

      if (nodeAtCursor?.nodeType === Node.TEXT_NODE) {
        textNode = nodeAtCursor as Text;
        if (textNode.textContent !== content) textNode.textContent = content;
      } else {
        textNode = document.createTextNode(content);
        parent!.insertBefore(textNode, nodeAtCursor || null);
      }

      this._cursor++;
      return textNode;
    }

    const textNode = document.createTextNode(content);
    if (parent) parent.appendChild(textNode);

    return textNode;
  };

  node = (existingNode: Node): Node => {
    const parent = this._parent;
    if (!parent) return existingNode;

    if (this._inBuildContext) {
      const ref = parent.childNodes[this._cursor] || null;
      const count =
        existingNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? existingNode.childNodes.length : 1;

      if (ref !== existingNode) {
        parent.insertBefore(existingNode, ref);
      }
      this._cursor += count;
    } else {
      parent.appendChild(existingNode);
    }

    return existingNode;
  };

  fragment = (cb: () => void): DocumentFragment => {
    const fragment = document.createDocumentFragment();
    this._stack.push(fragment);
    cb();
    this._stack.pop();

    return fragment;
  };
}

export default ElementBuilder;
export type { BuilderProps, HTMLTags, SVGOnlyTags };
