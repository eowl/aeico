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
