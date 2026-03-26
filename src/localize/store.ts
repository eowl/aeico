export interface LocaleProvider {
  t(key: string, ...args: any[]): string;
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
  private _initialized = false;

  get lang() { return this._lang; }
  get initialized() { return this._initialized; }

  t(key: string, fallback?: string): string {
    if (!this._initialized) return fallback || key;

    const value = key.split('.').reduce<LocaleData | string | undefined>(
      (current, k) => {
        if (current && typeof current === 'object' && k in current) {
          return current[k];
        }
        return undefined;
      }, this._resources
    );

    return typeof value === 'string' ? value : (fallback || key);
  }

  subscribe(cb: () => void) {
    this._subscribers.add(cb);
    
    return () => this._subscribers.delete(cb);
  }

  update(lang: string, resources: LocaleData) {
    this._lang = lang;
    this._resources = resources;
    this._initialized = true;
    this._subscribers.forEach(cb => cb());
  }
}

export const locale = new LocaleStore();