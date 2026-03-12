/**
 * Lightweight test helpers for mounting/unmounting custom elements.
 * No Lit dependency — replaces @open-wc/testing's fixture() / elementUpdated().
 */

/** Wrapper elements created by mount(), tracked for cleanup via unmountAll() */
const wrappers: Element[] = []

/**
 * Mount an HTML string into document.body and return the root element.
 * Automatically awaits custom element upgrade for hyphenated tag names.
 */
export async function mount<T extends HTMLElement>(html: string): Promise<T> {
  const wrapper = document.createElement('div')
  wrapper.innerHTML = html.trim()
  document.body.appendChild(wrapper)
  wrappers.push(wrapper)
  
  const el = wrapper.firstElementChild as T
  if (el.localName.includes('-')) {
    await customElements.whenDefined(el.localName)
  }

  return el
}

/**
 * Remove a single mounted element (and its wrapper) from the document.
 */
export function unmount(el: HTMLElement): void {
  const wrapper = el.parentElement

  if (wrapper && wrapper.parentElement) {
    wrapper.parentElement.removeChild(wrapper)
    const idx = wrappers.indexOf(wrapper)
    if (idx !== -1) wrappers.splice(idx, 1)
  }
}

/**
 * Remove all elements previously mounted via mount().
 * Suitable for use in afterEach() to keep the DOM clean between tests.
 */
export function unmountAll(): void {
  for (const wrapper of wrappers) {
    wrapper.parentElement?.removeChild(wrapper)
  }

  wrappers.length = 0
}

/**
 * Wait for a component's microtask-batched update to flush.
 * Matches AeicoElement's queueMicrotask() update scheduling.
 */
export function updated(): Promise<void> {
  return new Promise(resolve => queueMicrotask(resolve))
}
