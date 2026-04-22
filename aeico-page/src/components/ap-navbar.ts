import { AeicoElement } from 'aeico/core'
import type { Props } from 'aeico/core'
import { html } from 'aeico/view'
import type { SiteTree } from '../types.js'

const navbarCSS = `
  :host {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    position: sticky;
    top: 0;
    z-index: 100;
    height: var(--navbar-h, 52px);
    background: var(--surface, #fff);
    border-bottom: 1px solid var(--border, #e0dcd0);
    padding: 0 1.5rem;
  }
  .ap-brand {
    font-weight: 700;
    font-size: 1.05rem;
    margin-right: 1rem;
    color: var(--fg, #2c2c2c);
    text-decoration: none;
  }
  .ap-brand:hover { text-decoration: underline; }
  .ap-nav-links { display: flex; align-items: center; gap: 0.25rem; }
  .ap-nav-link {
    padding: 0.25rem 0.6rem;
    border-radius: 4px;
    color: var(--fg, #2c2c2c);
    text-decoration: none;
    font-size: 0.9rem;
  }
  .ap-nav-link:hover { background: var(--border, #e0dcd0); }
  .ap-active { color: var(--accent, #b45309); font-weight: 600; }
`

class ApNavbar extends AeicoElement {
  static tagName = 'ap-navbar'

  protected static override styles = navbarCSS

  static override props: Props = {
    data: { type: String },
    current: { type: String },
  }

  declare data?: string
  declare current?: string

  protected override render() {
    const tree = this._parseTree()
    const current = this.current ?? '/'
    const currentSection = current.split('/').filter(Boolean)[0] ?? null

    return html(({ nav, a, div }) => {
      nav({ className: 'ap-navbar' }, () => {
        a({
          href: '/',
          className: 'ap-brand',
          text: tree.home?.title ?? 'Home',
        })
        div({ className: 'ap-nav-links' }, () => {
          const homeActive = current === '/'
          a({
            href: '/',
            className: homeActive ? 'ap-nav-link ap-active' : 'ap-nav-link',
            'aria-current': homeActive ? 'page' : 'false',
            text: 'Home',
          })
          for (const section of tree.sections) {
            const isActive = currentSection === section.name
            a({
              href: section.entryRoute,
              className: isActive ? 'ap-nav-link ap-active' : 'ap-nav-link',
              'aria-current': isActive ? 'page' : 'false',
              text: section.name.charAt(0).toUpperCase() + section.name.slice(1),
            })
          }
        })
      })
    })
  }

  private _parseTree(): SiteTree {
    try {
      const parsed = JSON.parse(this.data ?? '{}') as Partial<SiteTree>
      return { home: parsed.home ?? null, sections: parsed.sections ?? [] }
    } catch {
      return { home: null, sections: [] }
    }
  }
}

export default ApNavbar
