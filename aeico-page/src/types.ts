export type TrailingSlashMode = 'always' | 'never'
export type SlugifyMode = 'lower' | 'preserve'

export type SiteConfig = {
  title: string
  description: string
  base: string
  origin: string
}

export type ContentConfig = {
  rootDir: string
}

export type RoutingConfig = {
  trailingSlash: TrailingSlashMode
  cleanIndex: boolean
  slugify: SlugifyMode
}

export type BuildConfig = {
  outDir: string
}

export type DevConfig = {
  port: number
  open: boolean
}

export type AeicoPageConfig = {
  site: SiteConfig
  content: ContentConfig
  routing: RoutingConfig
  build: BuildConfig
  dev: DevConfig
}

export type ParsedInputPage = {
  absPath: string
  relativePath: string
  source: string
}

export type ParsedPage = ParsedInputPage & {
  frontmatter: Record<string, unknown>
  content: string
  route: string
  title: string
  description: string
  draft: boolean
}

export type RenderedPage = ParsedPage & {
  html: string
}

export type SitePage = {
  title: string
  route: string
  relativePath: string
}

export type SiteSection = {
  name: string
  entryRoute: string
  pages: SitePage[]
}

export type SiteTree = {
  home: SitePage | null
  sections: SiteSection[]
}

export type BuildResult = {
  pages: number
  outDir?: string
  warnings: string[]
  routes: string[]
}

export type BuildOptions = {
  rootDir?: string
  configPath?: string
}

export const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/
export const RESERVED_SLUGS = new Set(['config', 'assets'])

export const DEFAULTS: AeicoPageConfig = {
  site: { title: 'aeico-page', description: '', base: '/', origin: '' },
  content: { rootDir: '_pages' },
  routing: { trailingSlash: 'always', cleanIndex: true, slugify: 'lower' },
  build: { outDir: 'dist' },
  dev: { port: 4173, open: false }
}
