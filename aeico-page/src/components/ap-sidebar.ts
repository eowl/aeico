import { AeicoElement } from 'aeico/core'
import type { Props } from 'aeico/core'
import { html } from 'aeico/view'
import type { SiteTree } from '../types.js'

const sidebarCSS = `
  :host {
    display: block;
    width: var(--sidebar-w, 220px);
    flex-shrink: 0;
    background: var(--surface, #fff);
    border-right: 1px solid var(--border, #e0dcd0);
    padding: 1.2rem 0.8rem;
    position: sticky;
    top: var(--navbar-h, 52px);
    height: calc(100vh - var(--navbar-h, 52px));
    overflow-y: auto;
  }
  ul { list-style: none; margin: 0; padding: 0; }
  li { margin: 0.2rem 0; }
  .ap-sidebar-link {
    display: block;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    color: var(--fg, #2c2c2c);
    text-decoration: none;
    font-size: 0.875rem;
  }
  .ap-sidebar-link:hover { background: var(--border, #e0dcd0); }
  .ap-active { color: var(--accent, #b45309); font-weight: 600; }
`

class ApSidebar extends AeicoElement {
  static tagName = 'ap-sidebar'

  protected static override styles = sidebarCSS

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

    if (!currentSection) return

    const section = tree.sections.find((s) => s.name === currentSection)
    if (!section) return

    return html(({ nav, ul, li, a }) => {
      nav({ className: 'ap-sidebar' }, () => {
        ul(() => {
          for (const page of section.pages) {
            const isActive = page.route === current
            li(() => {
              a({
                href: page.route,
                className: isActive ? 'ap-sidebar-link ap-active' : 'ap-sidebar-link',
                'aria-current': isActive ? 'page' : 'false',
                text: page.title,
              })
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

export default ApSidebar
