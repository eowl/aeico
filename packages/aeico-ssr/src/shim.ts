/**
 * Node.js / Edge Runtime DOM stub for aeico-ssr.
 *
 * Import this module BEFORE importing aeico-element so that `class BaseElement extends HTMLElement`
 * does not throw a ReferenceError at module load time.
 *
 * This shim is intentionally minimal - it only stubs globals that are accessed at module
 * evaluation time. Globals accessed only at runtime (attachShadow, adoptedStyleSheets, etc.)
 * are not needed because renderToString() never instantiates components.
 *
 * Idempotent: safe to import multiple times.
 *
 * @example
 * ```ts
 * import 'aeico-ssr/shim';
 * import { AeicoBase } from 'aeico-element';
 * import { renderToString } from 'aeico-ssr';
 * ```
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

if (typeof (globalThis as any).HTMLElement === 'undefined') {
  (globalThis as any).HTMLElement = class HTMLElement {
    shadowRoot: null = null;
    getAttribute(_name: string): string | null {
      return null;
    }
    setAttribute(_name: string, _value: string): void {}
    removeAttribute(_name: string): void {}
    hasAttribute(_name: string): boolean {
      return false;
    }
    attachShadow(_init: object): object {
      return { adoptedStyleSheets: [] };
    }
    dispatchEvent(_event: object): boolean {
      return true;
    }
    addEventListener(): void {}
    removeEventListener(): void {}
    appendChild<T>(node: T): T {
      return node;
    }
    replaceChildren(): void {}
    querySelector(): null {
      return null;
    }
  };
}

if (typeof (globalThis as any).customElements === 'undefined') {
  const _reverseRegistry = new Map<unknown, string>();
  (globalThis as any).customElements = {
    define(name: string, ctor: unknown) {
      _reverseRegistry.set(ctor, name);
    },
    get: () => undefined,
    getName(ctor: unknown): string | null {
      return _reverseRegistry.get(ctor) ?? null;
    },
    whenDefined: () => Promise.resolve(undefined),
  };
}
