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
  .ap-dropdown {
    position: relative;
  }
  .ap-dropdown-toggle {
    padding: 0.25rem 0.6rem;
    border-radius: 4px;
    color: var(--fg, #2c2c2c);
    font-size: 0.9rem;
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-family: inherit;
  }
  .ap-dropdown-toggle:hover { background: var(--border, #e0dcd0); }
  .ap-dropdown-toggle::after {
    content: '';
    display: inline-block;
    width: 0;
    height: 0;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-top: 4px solid currentColor;
  }
  .ap-dropdown-menu {
    display: none;
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    min-width: 140px;
    background: var(--surface, #fff);
    border: 1px solid var(--border, #e0dcd0);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    padding: 0.25rem 0;
    z-index: 200;
  }
  .ap-dropdown.open .ap-dropdown-menu { display: block; }
  .ap-dropdown-item {
    display: block;
    padding: 0.4rem 0.75rem;
    color: var(--fg, #2c2c2c);
    text-decoration: none;
    font-size: 0.9rem;
    white-space: nowrap;
  }
  .ap-dropdown-item:hover { background: var(--border, #e0dcd0); }
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

  override connectedCallback() {
    super.connectedCallback()
    // Close dropdowns when clicking outside the host element
    this._outsideClickHandler = (e: Event) => {
      if (!this.contains(e.target as Node) && !this.shadowRoot?.contains(e.target as Node)) {
        this._closeAllDropdowns()
      }
    }
    document.addEventListener('click', this._outsideClickHandler)
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    document.removeEventListener('click', this._outsideClickHandler)
  }

  private _outsideClickHandler: (e: Event) => void = () => {}

  private _closeAllDropdowns() {
    this.shadowRoot?.querySelectorAll('.ap-dropdown.open').forEach((el) => {
      el.classList.remove('open')
    })
  }

  protected override render() {
    const tree = this._parseTree()
    const current = this.current ?? '/'
    const currentSection = current.split('/').filter(Boolean)[0] ?? null

    return html(({ nav, a, div, button }) => {
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
            if (section.links.length > 1) {
              // Dropdown
              div({ className: 'ap-dropdown' }, () => {
                button({
                  className: 'ap-dropdown-toggle',
                  text: section.title,
                  '@click': (e: Event) => {
                    e.stopPropagation()
                    const wrapper = (e.target as HTMLElement).closest('.ap-dropdown')
                    const isOpen = wrapper?.classList.contains('open')
                    this._closeAllDropdowns()
                    if (!isOpen) wrapper?.classList.add('open')
                  },
                })
                div({ className: 'ap-dropdown-menu' }, () => {
                  for (const link of section.links) {
                    a({ className: 'ap-dropdown-item', href: link.url, text: link.title })
                  }
                })
              })
            } else if (section.links.length === 1) {
              // Single external link
              a({
                href: section.links[0].url,
                className: 'ap-nav-link',
                text: section.title,
              })
            } else {
              // Normal content section
              const isActive = currentSection === section.name
              a({
                href: section.entryRoute,
                className: isActive ? 'ap-nav-link ap-active' : 'ap-nav-link',
                'aria-current': isActive ? 'page' : 'false',
                text: section.title,
              })
            }
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
