import { getCurrentContext } from 'aeico-element';
import type { Updatable } from 'aeico-element';

export interface LocaleProvider {
  t(key: string, ...args: unknown[]): string;
  subscribe(callback: () => void): () => void;
  lang?: string;
}

export interface LocaleRegistry {
  readonly provider: LocaleProvider | null;
  setProvider(provider: LocaleProvider): void;
}

class LocaleRegistryImpl implements LocaleRegistry {
  private _provider: LocaleProvider | null = null;

  get provider() {
    return this._provider;
  }

  setProvider(provider: LocaleProvider) {
    if (provider && typeof provider.t === 'function' && typeof provider.subscribe === 'function') {
      this._provider = provider;
    } else {
      console.warn('[aeico] Invalid LocaleProvider provided.');
    }
  }
}

export const localeRegistry: LocaleRegistry = new LocaleRegistryImpl();

type LocaleData = {
  [key: string]: string | LocaleData;
};

export class LocaleStore implements LocaleProvider {
  private _lang = '';
  private _resources: LocaleData = {};
  private _subscribers = new Set<() => void>();
  private _components = new Set<Updatable>();
  private _initialized = false;

  /** Currently active locale code (e.g. `'en-US'`, `'zh-CN'`). Empty string before first `update()`. */
  get lang() {
    return this._lang;
  }

  /** `true` after the first `update()` call; `false` means translations haven't loaded yet. */
  get initialized() {
    return this._initialized;
  }

  /**
   * Look up a translation by dot-separated key.
   *
   * When called during a component's `render()`, the component is automatically
   * subscribed to locale changes and will re-render when `update()` is called.
   *
   * @param key      - Dot-separated path into the translations object (e.g. `'buttons.save'`).
   * @param fallback - Returned when the key is not found or the store is not yet initialized.
   *                   Defaults to `key` itself.
   *
   * @example
   * ```typescript
   * // In a component render()
   * span({ textContent: locale.t('errors.notFound', 'Not found') })
   *
   * // Or via the shorthand export
   * import { t } from 'aeico-localize'
   * span({ textContent: t('errors.notFound', 'Not found') })
   * ```
   */
  t(key: string, fallback?: string): string {
    this._subscribeComponent();

    if (!this._initialized) return fallback || key;

    const value = key.split('.').reduce<LocaleData | string | undefined>((current, k) => {
      if (current && typeof current === 'object' && k in current) {
        return current[k];
      }
      return undefined;
    }, this._resources);

    return typeof value === 'string' ? value : fallback || key;
  }

  /**
   * Subscribe to locale changes.
   *
   * The callback is invoked every time `update()` is called. Returns an
   * unsubscribe function.
   *
   * @example
   * ```typescript
   * const unsubscribe = locale.subscribe(() => {
   *   console.log('Locale changed to', locale.lang)
   * })
   * // Later:
   * unsubscribe()
   * ```
   */
  subscribe(cb: () => void) {
    this._subscribers.add(cb);

    return () => this._subscribers.delete(cb);
  }

  /**
   * Load a translation bundle and switch the active locale.
   *
   * Triggers a re-render on all components that called `t()` during their last
   * render cycle, and notifies all `subscribe()` callbacks.
   *
   * @param lang      - BCP 47 locale code (e.g. `'en-US'`, `'zh-CN'`).
   * @param resources - Nested translation object. Dot-path keys in `t()` map to
   *                    nested properties here.
   *
   * @example
   * ```typescript
   * locale.update('zh-CN', {
   *   buttons: { save: '保存', cancel: '取消' },
   *   errors:  { notFound: '未找到' },
   * })
   * ```
   */
  update(lang: string, resources: LocaleData) {
    this._lang = lang;
    this._resources = resources;
    this._initialized = true;
    this._subscribers.forEach((cb) => cb());

    this._updateComponents();
  }

  private _updateComponents() {
    for (const comp of this._components) {
      if (comp.isConnected) {
        comp.update();
      } else {
        this._components.delete(comp);
      }
    }
  }

  private _subscribeComponent() {
    const ctx = getCurrentContext();
    if (ctx) this._components.add(ctx);
  }
}

export const locale = new LocaleStore();

/**
 * Shorthand for `locale.t()` — translates a key using the global locale store.
 *
 * When called during a component's `render()`, the component is automatically
 * subscribed to locale changes.
 *
 * @param key       Dot-separated translation key (e.g. 'buttons.save')
 * @param fallback  Fallback string if key is not found (defaults to key itself)
 */
export const t: (key: string, fallback?: string) => string = locale.t.bind(locale);
