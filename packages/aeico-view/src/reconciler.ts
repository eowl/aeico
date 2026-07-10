const SVG_NS = 'http://www.w3.org/2000/svg';
import { camelToKebab } from './utils';

type _Style = Partial<CSSStyleDeclaration> & Record<string, string>;

type _Props = {
  className?: string | Record<string, boolean>;
  text?: string;
  textContent?: string;
  innerHTML?: string;
  id?: string;
  part?: string;
  role?: string;
  style?: _Style;
  key?: string;
};

type TagProps = _Props & Record<string, unknown>;

type TagFunction<K extends keyof HTMLElementTagNameMap> = {
  (props?: TagProps, cb?: () => void): HTMLElementTagNameMap[K];
  (cb: () => void): HTMLElementTagNameMap[K];
};

type HTMLTags = {
  readonly [K in keyof HTMLElementTagNameMap]: TagFunction<K>;
};

type SVGTagFunction<K extends keyof SVGElementTagNameMap> = {
  (props?: TagProps, cb?: () => void): SVGElementTagNameMap[K];
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
    (props?: TagProps, cb?: () => void): HTMLElementTagNameMap[K];
    (cb: () => void): HTMLElementTagNameMap[K];
  };
};

interface Reconciler extends HTMLTags, SVGOnlyTags, CustomHTMLTags {}

class Reconciler {
  /** @internal Ancestor node stack; the last entry is the current parent during a build pass. */
  private _stack: Node[] = [];

  /** @internal Parallel stack of child-index cursors, one entry per level of `_stack`. */
  private _cursorStack: number[] = [];

  /**
   * @internal
   * Per-element cache of the last-rendered normalized props.
   *
   * @remarks
   * Enables skip-equal-value diffing without allocating a new object on every render cycle.
   * The `WeakMap` key is the element itself, so entries are automatically collected when
   * the element is removed from the document and GC'd.
   */
  private _propsCache = new WeakMap<Element, Record<string, unknown>>();

  /**
   * @internal
   * Reusable scratch set that records which normalized keys were visited during the
   * current {@link _applyProps} call.
   *
   * @remarks
   * Declared at instance level so it is never re-allocated between calls; it is
   * cleared (not replaced) at the end of each {@link _applyProps} invocation.
   */
  private _scratchKeys = new Set<string>();

  /**
   * Creates a `Reconciler` instance wrapped in a `Proxy`.
   *
   * @remarks
   * Any property access that does not correspond to an existing member is intercepted
   * and treated as a tag-name shorthand (e.g. `builder.div`, `builder.benchRow`).
   * camelCase property names are converted to kebab-case tag names so that custom
   * elements can be addressed without quoting (e.g. `builder.myWidget` → `<my-widget>`).
   */
  constructor() {
    return new Proxy(this, {
      get(target, prop: string) {
        // Let normal property / method accesses fall through unchanged.
        if (prop in target) return Reflect.get(target, prop) as unknown;

        const tagName = /[A-Z]/.test(prop) ? camelToKebab(prop) : prop;

        // Return a tag function that accepts (props?, cb?) or (cb) overloads.
        return (p?: TagProps | (() => void), cb?: () => void) => {
          if (typeof p === 'function') return target._create(tagName, undefined, p);
          return target._create(tagName, p, cb);
        };
      },
    });
  }

  /**
   * @internal
   * The node that newly created children should be appended to at the current recursion level.
   */
  private get _parent(): Node | undefined {
    return this._stack[this._stack.length - 1];
  }

  /**
   * @internal
   * The child-index position expected for the next element at the current recursion level.
   */
  private get _cursor(): number {
    return this._cursorStack[this._cursorStack.length - 1];
  }

  private set _cursor(value: number) {
    this._cursorStack[this._cursorStack.length - 1] = value;
  }

  /**
   * @internal
   * Whether the builder is currently inside an active {@link build} pass over a real DOM parent.
   *
   * @remarks
   * Returns `true` only when a parent exists, the cursor stack is non-empty, and the parent
   * is not a bare `DocumentFragment`.  Bare fragments are excluded because their children
   * are transferred to the real DOM on insertion, making cursor-based diffing meaningless.
   */
  private get _inBuildContext(): boolean {
    return !!this._parent && this._cursorStack.length > 0 && !this._isBareFragment(this._parent);
  }

  /**
   * @internal
   * Core element-creation entry point used by both the Proxy tag functions and {@link el}.
   *
   * @param tagName - The HTML or SVG tag name to create or resolve.
   * @param props - Optional prop bag to apply to the element.
   * @param cb - Optional children callback; when present the element becomes the new parent.
   * @returns The resolved or newly created element.
   *
   * @remarks
   * Inside a build context the element is *resolved* (reused or inserted via diffing);
   * outside a build context it is always freshly created and appended to the current parent.
   */
  private _create(tagName: string, props?: TagProps, cb?: () => void): Element {
    const parent = this._parent;

    const el = this._inBuildContext
      ? this._resolveElement(parent!, tagName, props?.key)
      : this._createElement(tagName, parent);

    this._mountChildren(el, parent, props, cb);

    // Advance the cursor only after the element and all its children have been processed,
    // so that the cursor always points to the next sibling slot at this level.
    if (this._inBuildContext) this._cursor++;

    return el;
  }

  /**
   * @internal
   * Creates a new DOM element, switching to the SVG namespace when necessary.
   *
   * @param tagName - The tag name to create.
   * @param parent - The intended parent node; used to detect an SVG ancestor.
   * @returns A freshly created `Element` in the correct namespace.
   *
   * @remarks
   * The SVG namespace is inherited from an ancestor SVG element so that child tags
   * such as `<circle>` and `<path>` are created with the correct namespace URI.
   */
  private _createElement(tagName: string, parent?: Node): Element {
    // Inherit the SVG namespace from an ancestor SVG element so that child tags
    // like <circle>, <path>, etc. are created with the correct namespace URI.
    const isSVG =
      tagName === 'svg' || (parent instanceof Element && parent.namespaceURI === SVG_NS);

    return isSVG ? document.createElementNS(SVG_NS, tagName) : document.createElement(tagName);
  }

  /**
   * @internal
   * Returns the DOM element representing the current logical node, reusing an existing
   * child wherever possible to minimise DOM mutations.
   *
   * @param parent - The parent node whose children are searched.
   * @param tagName - The expected tag name of the element.
   * @param key - Optional stable key used for keyed reconciliation.
   * @returns The resolved (or newly created) element at the current cursor position.
   *
   * @remarks
   * Two resolution strategies are applied:
   * - **Keyed** — searches forward from the cursor for a child whose `data-key` matches,
   *   then moves it to the cursor position (preserves identity across list reorders).
   * - **Unkeyed** — accepts the child already sitting at the cursor if its tag name
   *   matches and it carries no `data-key` (prevents mixing keyed/unkeyed siblings).
   *
   * A fresh element is created and inserted whenever no suitable match is found.
   */
  private _resolveElement(parent: Node, tagName: string, key?: string): Element {
    const cursor = this._cursor;
    let el: Element | null = null;

    if (key) {
      el = this._findChildByKey(parent, key, cursor);
      if (el) {
        // Move the found element to the expected cursor position if it has drifted.
        if (parent.childNodes[cursor] !== el) {
          parent.insertBefore(el, parent.childNodes[cursor]);
        }
        // Discard and recreate if the tag name changed (e.g. key reused with different tag).
        if (el.tagName.toLowerCase() !== tagName.toLowerCase()) {
          el.remove();
          el = null;
        }
      }
    } else {
      const nodeAtCursor = parent.childNodes[cursor] as Element;
      // Only reuse if the tag matches AND the node is not keyed, because keyed nodes
      // belong to the keyed resolution path and should never be claimed by an unkeyed slot.
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
      // Insert before the node currently at the cursor (or append if none) so the
      // new element lands at exactly the right position without disturbing siblings.
      parent.insertBefore(el, parent.childNodes[cursor] || null);
    }

    return el;
  }

  /**
   * @internal
   * Applies props to `el` and, when a children callback is present, manages the
   * recursive build context for the element's subtree.
   *
   * @param el - The element whose props and children are being mounted.
   * @param parent - The parent node; `el` is appended here if not yet attached.
   * @param props - Optional prop bag to apply.
   * @param cb - Optional children callback that renders `el`'s descendants.
   *
   * @remarks
   * When `cb` is present, `el` is pushed onto the node stack with a fresh cursor so
   * that child elements are reconciled relative to it.  After `cb` returns, surplus
   * children (left over from a previous render) are removed via {@link _cleanup}, and
   * both the stack and cursor are restored.
   *
   * `text` / `textContent` props are suppressed (`skipTextContent = true`) when a
   * children callback is provided, because the callback owns text rendering and the
   * two mechanisms would conflict.
   */
  private _mountChildren(
    el: Element,
    parent: Node | undefined,
    props?: TagProps,
    cb?: () => void,
  ): void {
    if (cb) {
      if (props) this._applyProps(el, props, /* skipTextContent */ true);
      if (parent && !el.parentNode) parent.appendChild(el);
      this._stack.push(el);
      this._cursorStack.push(0);
      cb();
      // Trim any children left over from a previous render that the callback did not visit.
      this._cleanup(el, this._cursor);
      this._cursorStack.pop();
      this._stack.pop();
    } else {
      if (props) this._applyProps(el, props);
      if (parent && !el.parentNode) parent.appendChild(el);
    }
  }

  /**
   * @internal
   * Scans `parent`'s child list from `start` onward for an element whose `data-key`
   * attribute equals `key`.
   *
   * @param parent - The node whose children are searched.
   * @param key - The `data-key` value to look for.
   * @param start - The child index from which to begin searching (inclusive).
   * @returns The first matching element, or `null` if none is found.
   *
   * @remarks
   * The search begins at the cursor position rather than index 0 because keyed nodes
   * are always expected to appear at or after the current render position — searching
   * behind the cursor would risk claiming a node that has already been reconciled.
   */
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

  /**
   * @internal
   * Returns `true` when `node` is a plain `DocumentFragment` rather than a `ShadowRoot`.
   *
   * @param node - The node to test.
   * @returns `true` if `node` is a `DocumentFragment` but not a `ShadowRoot`.
   *
   * @remarks
   * `ShadowRoot` extends `DocumentFragment` in the DOM spec, so both share the same
   * `nodeType`.  An `instanceof ShadowRoot` check is required to distinguish them.
   */
  private _isBareFragment(node: Node): boolean {
    return node.nodeType === Node.DOCUMENT_FRAGMENT_NODE && !(node instanceof ShadowRoot);
  }

  /**
   * Executes a declarative render `block` against `root`, reconciling the resulting
   * structure with the existing DOM children of `root`.
   *
   * @param root - The stable container node to render into.  Must be the same node
   *   across re-renders so that the cursor-based diffing algorithm can recycle children.
   * @param block - A function that imperatively describes the desired child structure
   *   by calling builder tag helpers (e.g. `builder.div(…)`).
   *
   * @remarks
   * This is the primary public entry point for the builder.  Each call constitutes one
   * full render pass: props that changed are updated, new nodes are inserted, and nodes
   * that the block no longer visits are removed.
   */
  public build(root: Node, block: () => void): void {
    this._stack = [root];
    this._cursorStack = [0];

    block();

    // Remove any children that the block did not visit — they are no longer part of
    // the intended output.  _cursorStack[0] holds the final cursor value for root.
    this._cleanup(root, this._cursorStack[0]);

    // Reset state so the builder can be safely reused for the next render.
    this._stack = [];
    this._cursorStack = [];
  }

  /**
   * @internal
   * Removes trailing children of `parent` that exceed the rendered count.
   *
   * @param parent - The node whose surplus children are removed.
   * @param activeCount - The number of children that should remain.
   *
   * @remarks
   * Called after a render block completes to trim nodes that were not visited,
   * i.e. nodes that are no longer part of the logical output.
   */
  private _cleanup(parent: Node, activeCount: number) {
    while (parent.childNodes.length > activeCount) {
      parent.removeChild(parent.lastChild!);
    }
  }

  /**
   * @internal
   * Reconciles `props` against the element's cached prop state, writing only changed
   * values to the DOM.
   *
   * @param el - The element to update.
   * @param props - The raw prop bag from the current render call.
   * @param skipTextContent - When `true`, `text` / `textContent` props are ignored
   *   because a children callback owns the text rendering for this element.
   *
   * @remarks
   * **Allocation strategy — zero heap objects per call after the first render:**
   * - `cache` is the long-lived `Record` stored in `_propsCache`; created once per
   *   element and mutated in-place on every subsequent call.
   * - `_scratchKeys` is an instance-level `Set` cleared (not recreated) after each
   *   call; it tracks which normalized keys were visited so that {@link _removeStaleProps}
   *   can identify keys to delete.
   */
  private _applyProps(el: Element, props: TagProps, skipTextContent: boolean = false) {
    let cache = this._propsCache.get(el);
    if (!cache) {
      // First render for this element: initialize an empty cache object.
      cache = {};
      this._propsCache.set(el, cache);
    }
    const scratch = this._scratchKeys;

    for (const [key, value] of Object.entries(props)) {
      if (key === 'key') continue; // 'key' is a diffing hint, not a real DOM prop.

      const [ck, normalized] = this._normalizeProp(key, value, skipTextContent);
      if (ck === null) continue; // Prop was intentionally skipped (e.g. textContent when suppressed).

      scratch.add(ck);
      if (cache[ck] === normalized) continue; // Value unchanged — skip DOM write.

      const oldValue = cache[ck];
      cache[ck] = normalized; // Update cache before writing to DOM so it reflects reality on throw.
      this._writePropToDom(el, ck, normalized, oldValue);
    }

    this._removeStaleProps(el, cache, scratch, skipTextContent);
    scratch.clear(); // Reset for the next _applyProps call — avoids re-allocating the Set.
  }

  /**
   * @internal
   * Converts a raw prop key/value pair into the canonical form used by `_propsCache`
   * and {@link _writePropToDom}.
   *
   * @param key - The raw prop key as supplied by the caller.
   * @param value - The raw prop value.
   * @param skipTextContent - When `true`, text-related keys return `[null, null]`.
   * @returns A `[canonicalKey, normalizedValue]` tuple, or `[null, null]` to skip the prop.
   *
   * @remarks
   * Normalization rules (first match wins):
   * - `text` | `textContent` → `'textContent'` (shorthand alias)
   * - `className` | `class` → `'class'`; object maps are collapsed to a space-separated string
   * - `@eventName` → stored with the `@` prefix to distinguish handlers from attributes
   *   and prevent `setAttribute` / `removeEventListener` conflicts
   * - All other keys pass through unchanged.
   *
   * The `[null, null]` sentinel avoids the need for a separate skip flag in the caller.
   */
  private _normalizeProp(
    key: string,
    value: unknown,
    skipTextContent: boolean,
  ): [string, unknown] | [null, null] {
    if (key === 'text' || key === 'textContent') {
      if (skipTextContent) return [null, null];
      return ['textContent', value];
    }
    if (key === 'innerHTML') {
      return ['innerHTML', value];
    }
    if (key === 'className' || key === 'class') {
      if (value == null || value === false) return ['class', null];
      if (typeof value === 'object') {
        // Object map form: { active: true, hidden: false } → 'active'
        return [
          'class',
          Object.entries(value as Record<string, boolean>)
            .filter(([_, a]) => a)
            .map(([n]) => n)
            .join(' '),
        ];
      }
      return ['class', String(value as string | number | boolean | bigint)];
    }
    if (key.startsWith('@') && typeof value === 'function') {
      // Preserve the '@' prefix so event handlers can be identified in _writePropToDom
      // and _removeStaleProps without an additional data structure.
      return [`@${key.slice(1)}`, value];
    }

    return [key, value];
  }

  /**
   * @internal
   * Writes a single already-normalized prop change to the live DOM element.
   *
   * @param el - The element to update.
   * @param ck - The canonical (normalized) prop key.
   * @param value - The new value to apply.
   * @param oldValue - The previous cached value; used to remove a stale event listener
   *   before registering the replacement.
   *
   * @remarks
   * Dispatch order (first match wins):
   * 1. `null | false` → remove the prop via {@link _removeProp}
   * 2. `'class'`      → `setAttribute('class', …)`
   * 3. `'textContent'`→ `el.textContent`
   * 4. `'style'`      → merge individual CSS / custom properties
   * 5. `'@…'`         → remove old listener, add new listener
   * 6. `boolean`      → presence-only attribute (`setAttribute(ck, '')`)
   * 7. `object`       → assign as a JS property (supports arrays, DOM refs, etc.)
   * 8. anything else  → `setAttribute` with string coercion
   *
   * `oldValue` is required for event handlers because the browser does not
   * deduplicate `addEventListener` calls when the function reference changes.
   */
  private _writePropToDom(el: Element, ck: string, value: unknown, oldValue: unknown): void {
    if (value == null || value === false) {
      this._removeProp(el, ck);
      return;
    }
    if (ck === 'class') {
      el.setAttribute('class', value as string);
    } else if (ck === 'textContent') {
      el.textContent = value as string;
    } else if (ck === 'innerHTML') {
      el.innerHTML = value as string;
    } else if (ck === 'style') {
      if (typeof value === 'object' && 'style' in el) {
        const s = (el as HTMLElement).style;
        for (const [k, v] of Object.entries(value as Record<string, string>)) {
          // CSS custom properties (--foo) require setProperty; camelCase ones can be
          // assigned directly via the style object's index signature.
          if (k.startsWith('--')) s.setProperty(k, v);
          else (s as unknown as Record<string, string>)[k] = v;
        }
      }
    } else if (ck.startsWith('@')) {
      const eventName = ck.slice(1);
      // Always remove the old listener first to avoid duplicate registrations when
      // the handler function reference is replaced (e.g. an arrow function in render).
      if (oldValue) el.removeEventListener(eventName, oldValue as EventListener);
      el.addEventListener(eventName, value as EventListener);
    } else if (typeof value === 'boolean') {
      // Boolean `true` → presence-only attribute (e.g. `disabled`, `checked`).
      el.setAttribute(ck, '');
    } else if (typeof value === 'object') {
      // Set as a JS property to support complex values (arrays, objects, DOM nodes).
      (el as unknown as Record<string, unknown>)[ck] = value;
    } else {
      el.setAttribute(ck, String(value as string | number | bigint));
    }
  }

  /**
   * @internal
   * Removes props that were present in the previous render but absent in the current one.
   *
   * @param el - The element from which stale props are removed.
   * @param cache - The element's mutable prop cache; stale entries are deleted in-place.
   * @param scratch - The set of canonical keys that were visited in this render pass.
   * @param skipTextContent - When `true`, a stale `'textContent'` key is left untouched.
   *
   * @remarks
   * A key is considered stale when it exists in `cache` but is absent from `scratch`.
   * Each stale key is deleted from `cache` **before** its DOM side-effect is applied so
   * the cache remains consistent even if an error is thrown mid-loop.
   *
   * Style rollback clears individual properties rather than resetting `cssText` so that
   * styles from other sources (e.g. attributes set externally) are not unintentionally wiped.
   */
  private _removeStaleProps(
    el: Element,
    cache: Record<string, unknown>,
    scratch: Set<string>,
    skipTextContent: boolean,
  ): void {
    for (const ck of Object.keys(cache)) {
      if (scratch.has(ck)) continue; // Key still present in this render — leave it alone.

      // When the children callback owns text rendering, leave `textContent` in the cache;
      // it was never set by _applyProps and should not be cleared here.
      if (ck === 'textContent' && skipTextContent) continue;

      const oldValue = cache[ck];
      delete cache[ck];

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
        // Null out JS property (set via object dispatch path in _writePropToDom).
        (el as unknown as Record<string, unknown>)[ck] = null;
      } else {
        this._removeProp(el, ck);
      }
    }
  }

  /**
   * @internal
   * Removes a single DOM prop by its canonical key, handling special cases that
   * cannot use `removeAttribute` directly.
   *
   * @param el - The element from which the prop is removed.
   * @param key - The canonical prop key to remove.
   *
   * @remarks
   * Event-handler keys (`@…`) are intentionally ignored here.  Listener cleanup
   * always requires the old function reference, which is available only in
   * {@link _writePropToDom} and {@link _removeStaleProps}.
   */
  private _removeProp(el: Element, key: string): void {
    if (key === 'class') el.removeAttribute('class');
    else if (key === 'textContent') el.textContent = '';
    // Reset the entire inline style block rather than removing the attribute, which
    // would leave the element styled by inherited or external rules unexpectedly.
    else if (key === 'style' && 'style' in el) (el as HTMLElement).style.cssText = '';
    else if (!key.startsWith('@')) el.removeAttribute(key);
  }

  /**
   * Executes `fn` outside of any active build context, then restores the previous
   * context unconditionally.
   *
   * @param fn - The function to execute in a detached (context-free) state.
   * @returns Whatever `fn` returns.
   *
   * @remarks
   * Use this when builder calls must be made inside an event handler or an async
   * callback that fires while a {@link build} pass is still in progress.  Without
   * detaching, those calls would incorrectly advance the parent build's cursor.
   *
   * The previous context is restored in a `finally` block so it is never permanently
   * corrupted, even if `fn` throws.
   */
  detached<T>(fn: () => T): T {
    const savedStack = this._stack;
    const savedCursor = this._cursorStack;
    // Clear the context so _inBuildContext returns false during fn().
    this._stack = [];
    this._cursorStack = [];

    try {
      return fn();
    } finally {
      // Restore in a finally block so the context is never permanently corrupted
      // even if fn() throws.
      this._stack = savedStack;
      this._cursorStack = savedCursor;
    }
  }

  /**
   * Creates or reconciles an element identified by a dynamic tag name string.
   *
   * @param tagName - An HTML or SVG tag name (e.g. `'div'`, `'svg'`, `'my-widget'`).
   * @param propsOrCb - Either a prop bag or a children callback.
   * @param cb - Children callback when `propsOrCb` is a prop bag.
   * @returns The resolved or newly created element, narrowed to the appropriate DOM type.
   *
   * @remarks
   * Prefer the Proxy shorthand (`builder.div(…)`) for statically known tags.
   * Use `el()` when the tag name is determined at runtime or when TypeScript's
   * Proxy inference is insufficient.
   *
   * Supports the same `(props?, cb?)` / `(cb)` overloads as the Proxy tag functions.
   */
  el = <T extends keyof HTMLElementTagNameMap | keyof SVGElementTagNameMap>(
    tagName: T,
    propsOrCb?: TagProps | (() => void),
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

  /**
   * Creates or reconciles a `Text` node at the current cursor position.
   *
   * @param content - The text content to render.
   * @returns The live `Text` node.
   *
   * @remarks
   * Inside a build context the existing node at the cursor is reused when it is already
   * a `Text` node, updating its content only when it has changed to avoid unnecessary
   * DOM mutations and keep the node reference stable for external observers.
   *
   * Outside a build context a fresh `Text` node is created and appended to the current
   * parent, or returned detached when there is no parent.
   */
  text = (content: string): Text => {
    const parent = this._parent;

    if (this._inBuildContext) {
      const nodeAtCursor = parent!.childNodes[this._cursor];
      let textNode: Text;

      if (nodeAtCursor?.nodeType === Node.TEXT_NODE) {
        // Reuse the existing text node; skip the assignment if content is unchanged
        // to avoid triggering layout invalidation.
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

  /**
   * Inserts an existing `Node` (or `DocumentFragment`) into the current parent,
   * advancing the cursor by the number of top-level nodes contributed.
   *
   * @param existingNode - A pre-built node or fragment to insert.
   * @returns The same `existingNode` reference.
   *
   * @remarks
   * When `existingNode` is a `DocumentFragment`, all of its children are transferred
   * to the parent on insertion (the fragment itself becomes empty), so the cursor
   * advances by the fragment's child count rather than by 1.
   *
   * Use this to portal pre-built subtrees or to adopt nodes created outside the
   * builder into the reconciled tree.
   */
  node = (existingNode: Node): Node => {
    const parent = this._parent;
    if (!parent) return existingNode;

    if (this._inBuildContext) {
      const ref = parent.childNodes[this._cursor] || null;
      // A DocumentFragment donates all its children when inserted, so the cursor
      // must skip over all of them to stay in sync with the real DOM layout.
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

  /**
   * Runs `cb` in a bare `DocumentFragment` context and returns the populated fragment.
   *
   * @param cb - A children callback that populates the fragment.
   * @returns A `DocumentFragment` containing the nodes created by `cb`.
   *
   * @remarks
   * Because a bare `DocumentFragment` is treated as a non-build context
   * (see `_inBuildContext`), elements created inside `cb` are always freshly appended
   * rather than reconciled by cursor position.  This makes `fragment()` suitable for
   * one-time subtree construction (e.g. initial content, template cloning) but not
   * for re-renderable components.
   */
  fragment = (cb: () => void): DocumentFragment => {
    const fragment = document.createDocumentFragment();
    this._stack.push(fragment);
    cb();
    this._stack.pop();

    return fragment;
  };
}

export default Reconciler;
export type { TagProps, HTMLTags, SVGOnlyTags };
