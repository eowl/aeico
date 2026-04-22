import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

type I18nMode = 'same-path' | 'prefixed-path'
type TrailingSlashMode = 'always' | 'never'
type SlugifyMode = 'lower' | 'preserve'

type SiteConfig = {
  title: string
  description: string
  base: string
  origin: string
}

type ContentConfig = {
  rootDir: string
  include: string[]
  exclude: string[]
}

type LayoutConfig = {
  rootDir: string
  defaultLayout: string
  partials: {
    header: string
    footer: string
    menu: string
  }
}

type RoutingConfig = {
  trailingSlash: TrailingSlashMode
  cleanIndex: boolean
  slugify: SlugifyMode
}

type I18nConfig = {
  enabled: boolean
  mode: I18nMode
  defaultLocale: string
  locales: string[]
  localeDetection: string
}

type ThemeConfig = {
  mode: string
  switchable: boolean
  themeDir: string
}

type BuildConfig = {
  outDir: string
  minifyHtml: boolean
  sitemap: boolean
  rss: boolean
}

type DevConfig = {
  port: number
  open: boolean
}

export type AeicoPageConfig = {
  site: SiteConfig
  content: ContentConfig
  layout: LayoutConfig
  routing: RoutingConfig
  i18n: I18nConfig
  theme: ThemeConfig
  build: BuildConfig
  dev: DevConfig
}

type ParsedInputPage = {
  absPath: string
  relativePath: string
  source: string
}

type ParsedPage = ParsedInputPage & {
  frontmatter: Record<string, unknown>
  content: string
  route: string
  title: string
  description: string
  layoutName: string
  lang: string
  draft: boolean
}

type RenderedPage = ParsedPage & {
  html: string
}

type WritePayload = {
  rootDir: string
  config: AeicoPageConfig
  renderedPages: RenderedPage[]
}

export type BuildResult = {
  pages: number
  outDir?: string
  warnings: string[]
  routes: string[]
}

type MaybePromise<T> = T | Promise<T>

export type AeicoPagePlugin = {
  beforeParse?: (pages: ParsedInputPage[]) => MaybePromise<ParsedInputPage[]>
  afterParse?: (pages: ParsedPage[]) => MaybePromise<ParsedPage[]>
  beforeRender?: (page: ParsedPage) => MaybePromise<ParsedPage>
  afterRender?: (page: RenderedPage) => MaybePromise<RenderedPage>
  beforeWrite?: (payload: WritePayload) => MaybePromise<WritePayload>
}

export type BuildOptions = {
  rootDir?: string
  configPath?: string
  plugins?: AeicoPagePlugin[]
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/
const RESERVED_SLUGS = new Set(['config', 'layout', 'content'])

const DEFAULTS: AeicoPageConfig = {
  site: { title: 'aeico-page', description: '', base: '/', origin: '' },
  content: { rootDir: 'content', include: ['**/*.md'], exclude: [] },
  layout: {
    rootDir: 'layout',
    defaultLayout: 'home',
    partials: { header: 'header', footer: 'footer', menu: 'menu' }
  },
  routing: { trailingSlash: 'always', cleanIndex: true, slugify: 'lower' },
  i18n: {
    enabled: true,
    mode: 'same-path',
    defaultLocale: 'zh-CN',
    locales: ['zh-CN', 'en-US'],
    localeDetection: 'none'
  },
  theme: { mode: 'auto', switchable: true, themeDir: '' },
  build: { outDir: 'dist', minifyHtml: false, sitemap: false, rss: false },
  dev: { port: 4173, open: false }
}

function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true })
}

function readJson(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

function mergeConfig(userConfig: Partial<AeicoPageConfig>): AeicoPageConfig {
  const config = userConfig ?? {}
  return {
    ...DEFAULTS,
    ...config,
    site: { ...DEFAULTS.site, ...(config.site ?? {}) },
    content: { ...DEFAULTS.content, ...(config.content ?? {}) },
    layout: {
      ...DEFAULTS.layout,
      ...(config.layout ?? {}),
      partials: { ...DEFAULTS.layout.partials, ...(config.layout?.partials ?? {}) }
    },
    routing: { ...DEFAULTS.routing, ...(config.routing ?? {}) },
    i18n: { ...DEFAULTS.i18n, ...(config.i18n ?? {}) },
    theme: { ...DEFAULTS.theme, ...(config.theme ?? {}) },
    build: { ...DEFAULTS.build, ...(config.build ?? {}) },
    dev: { ...DEFAULTS.dev, ...(config.dev ?? {}) }
  }
}

function validateConfig(config: AeicoPageConfig): void {
  if (!['same-path', 'prefixed-path'].includes(config.i18n.mode)) {
    throw new Error(`Invalid i18n.mode '${config.i18n.mode}'. Use 'same-path' or 'prefixed-path'.`)
  }
  if (!['always', 'never'].includes(config.routing.trailingSlash)) {
    throw new Error(`Invalid routing.trailingSlash '${config.routing.trailingSlash}'. Use 'always' or 'never'.`)
  }
  if (!['lower', 'preserve'].includes(config.routing.slugify)) {
    throw new Error(`Invalid routing.slugify '${config.routing.slugify}'. Use 'lower' or 'preserve'.`)
  }
}

export function getDefaultThemeLayoutDir(): string {
  return fileURLToPath(new URL('../../aeico-page-theme-default/layout/', import.meta.url))
}

export function loadConfig({ rootDir = process.cwd(), configPath = 'config.json' }: { rootDir?: string; configPath?: string } = {}): {
  config: AeicoPageConfig
  configPath: string
} {
  const resolvedPath = path.resolve(rootDir, configPath)
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`config.json not found: ${resolvedPath}`)
  }
  const merged = mergeConfig(readJson(resolvedPath) as Partial<AeicoPageConfig>)
  validateConfig(merged)
  return { config: merged, configPath: resolvedPath }
}

function walkMarkdownFiles(baseDir: string): string[] {
  const files: string[] = []

  function walk(current: string): void {
    const entries = fs.readdirSync(current, { withFileTypes: true })
    for (const entry of entries) {
      const abs = path.join(current, entry.name)
      if (entry.isDirectory()) {
        walk(abs)
      } else if (entry.isFile() && abs.toLowerCase().endsWith('.md')) {
        files.push(abs)
      }
    }
  }

  if (fs.existsSync(baseDir)) {
    walk(baseDir)
  }

  return files
}

function parseFrontmatter(markdown: string): { data: Record<string, unknown>; content: string } {
  const match = markdown.match(FRONTMATTER_RE)
  if (!match) {
    return { data: {}, content: markdown }
  }

  const data: Record<string, unknown> = {}
  for (const line of match[1].split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }
    const idx = trimmed.indexOf(':')
    if (idx <= 0) {
      continue
    }
    const key = trimmed.slice(0, idx).trim()
    let value = trimmed.slice(idx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (value === 'true') {
      data[key] = true
    } else if (value === 'false') {
      data[key] = false
    } else if (/^\d+$/.test(value)) {
      data[key] = Number(value)
    } else {
      data[key] = value
    }
  }

  return {
    data,
    content: markdown.slice(match[0].length)
  }
}

function escapeHtml(text: unknown): string {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function markdownToHtml(markdown: string): string {
  const lines = markdown.replaceAll('\r\n', '\n').split('\n')
  const html: string[] = []
  let paragraphBuffer: string[] = []

  function flushParagraph(): void {
    if (paragraphBuffer.length === 0) {
      return
    }
    html.push(`<p>${paragraphBuffer.join(' ')}</p>`)
    paragraphBuffer = []
  }

  for (const lineRaw of lines) {
    const line = lineRaw.trim()
    if (!line) {
      flushParagraph()
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/)
    if (heading) {
      flushParagraph()
      const level = heading[1].length
      html.push(`<h${level}>${escapeHtml(heading[2])}</h${level}>`)
      continue
    }

    if (line === '---') {
      flushParagraph()
      html.push('<hr />')
      continue
    }

    const safe = escapeHtml(line).replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    paragraphBuffer.push(safe)
  }

  flushParagraph()
  return html.join('\n')
}

function normalizeSegment(segment: string, mode: SlugifyMode): string {
  let value = segment.trim()
  value = value.replace(/\s+/g, '-')
  value = value.replace(/[^a-zA-Z0-9\-_.]/g, '-')
  value = value.replace(/-+/g, '-')
  return mode === 'lower' ? value.toLowerCase() : value
}

function relativeMdToRoute(relativePath: string, routing: RoutingConfig): string {
  const noExt = relativePath.replace(/\.md$/i, '')
  const parts = noExt
    .split(/[\\/]+/)
    .filter(Boolean)
    .map((part) => normalizeSegment(part, routing.slugify))

  if (routing.cleanIndex && parts.at(-1) === 'index') {
    parts.pop()
  }

  const route = '/' + parts.join('/')
  return route === '/' ? '/' : route
}

function inferTitle(relativePathNoExt: string): string {
  const name = path.basename(relativePathNoExt)
  if (!name || name === 'index') {
    return 'Untitled'
  }
  return name
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(' ')
}

function validateRoute(route: string): void {
  const segments = route.split('/').filter(Boolean)
  for (const seg of segments) {
    if (RESERVED_SLUGS.has(seg.toLowerCase())) {
      throw new Error(`Route contains reserved segment: ${route}`)
    }
    if (!/^[a-zA-Z0-9\-_.]+$/.test(seg)) {
      throw new Error(`Route contains illegal segment '${seg}' in ${route}`)
    }
  }
}

function routeToOutputFile(route: string, outDir: string, trailingSlash: TrailingSlashMode): string {
  const normalized = route === '/' ? '' : route.replace(/^\//, '')
  if (trailingSlash === 'never') {
    const fileName = normalized ? `${normalized}.html` : 'index.html'
    return path.join(outDir, fileName)
  }
  return path.join(outDir, normalized, 'index.html')
}

function deepGet(obj: Record<string, unknown>, keyPath: string): unknown {
  return keyPath.split('.').reduce<unknown>((acc, key) => {
    if (typeof acc === 'object' && acc !== null && key in acc) {
      return (acc as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}

function renderTemplate(template: string, context: Record<string, unknown>): string {
  return template.replace(/{{\s*([a-zA-Z0-9_.]+)\s*}}/g, (_, keyPath: string) => {
    const value = deepGet(context, keyPath)
    if (value === undefined || value === null) {
      return ''
    }
    return String(value)
  })
}

function resolveLayoutFile(name: string, layoutDirs: string[], required: boolean, warnings: string[]): string {
  for (const layoutDir of layoutDirs) {
    const filePath = path.join(layoutDir, `${name}.md`)
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8')
    }
  }

  if (required) {
    throw new Error(`Missing required layout file '${name}.md' in: ${layoutDirs.join(', ')}`)
  }

  warnings.push(`Missing optional partial '${name}.md', fallback to empty content.`)
  return ''
}

function resolveLayoutDirs(rootDir: string, config: AeicoPageConfig): string[] {
  const dirs = [path.resolve(rootDir, config.layout.rootDir)]
  if (config.theme.themeDir) {
    dirs.push(path.resolve(rootDir, config.theme.themeDir))
  }
  dirs.push(getDefaultThemeLayoutDir())
  return dirs
}

async function applyHookPlugins<T>(plugins: AeicoPagePlugin[], hookName: keyof AeicoPagePlugin, payload: T): Promise<T> {
  let nextPayload = payload
  for (const plugin of plugins) {
    const hook = plugin?.[hookName]
    if (typeof hook !== 'function') {
      continue
    }
    const result = await (hook as (arg: T) => MaybePromise<T>)(nextPayload)
    if (result !== undefined) {
      nextPayload = result
    }
  }
  return nextPayload
}

export function scanContent({ rootDir, config }: { rootDir: string; config: AeicoPageConfig }): ParsedInputPage[] {
  const contentDir = path.resolve(rootDir, config.content.rootDir)
  return walkMarkdownFiles(contentDir).map((absPath) => ({
    absPath,
    relativePath: path.relative(contentDir, absPath),
    source: fs.readFileSync(absPath, 'utf-8')
  }))
}

export function resolveRoutes({ pages, config }: { pages: ParsedPage[]; config: AeicoPageConfig }): ParsedPage[] {
  const routeSet = new Set<string>()
  for (const page of pages) {
    const route = relativeMdToRoute(page.relativePath, config.routing)
    validateRoute(route)
    const key = route.toLowerCase()
    if (routeSet.has(key)) {
      throw new Error(`Route conflict detected: ${route}`)
    }
    routeSet.add(key)
    page.route = route
  }
  return pages
}

function transformParsedPage(page: ParsedInputPage, config: AeicoPageConfig): ParsedPage {
  const parsed = parseFrontmatter(page.source)
  const frontmatter = parsed.data

  if (frontmatter.date !== undefined && Number.isNaN(Date.parse(String(frontmatter.date)))) {
    throw new Error(`Invalid date in frontmatter: ${page.absPath}`)
  }

  return {
    ...page,
    frontmatter,
    content: parsed.content,
    route: '',
    title: String(frontmatter.title ?? inferTitle(page.relativePath.replace(/\.md$/i, ''))),
    description: String(frontmatter.description ?? ''),
    layoutName: String(frontmatter.layout ?? config.layout.defaultLayout ?? 'home'),
    lang: String(frontmatter.lang ?? config.i18n.defaultLocale),
    draft: frontmatter.draft === true
  }
}

function renderPageHtml({ page, config, layoutDirs, warnings }: { page: ParsedPage; config: AeicoPageConfig; layoutDirs: string[]; warnings: string[] }): string {
  const homeTemplate = resolveLayoutFile(page.layoutName, layoutDirs, true, warnings)
  const headerRaw = resolveLayoutFile(config.layout.partials.header, layoutDirs, false, warnings)
  const footerRaw = resolveLayoutFile(config.layout.partials.footer, layoutDirs, false, warnings)
  const menuRaw = resolveLayoutFile(config.layout.partials.menu, layoutDirs, false, warnings)

  const partialContext: Record<string, unknown> = {
    page: {
      title: page.title,
      description: page.description,
      lang: page.lang,
      route: page.route
    },
    site: config.site,
    config,
    theme: config.theme
  }

  const renderedHeader = markdownToHtml(renderTemplate(headerRaw, partialContext))
  const renderedFooter = markdownToHtml(renderTemplate(footerRaw, partialContext))
  const renderedMenu = markdownToHtml(renderTemplate(menuRaw, partialContext))

  const templateContext: Record<string, unknown> = {
    page: (partialContext.page as Record<string, unknown>),
    site: config.site,
    config,
    theme: config.theme,
    content: markdownToHtml(page.content),
    partial: {
      header: renderedHeader,
      footer: renderedFooter,
      menu: renderedMenu
    },
    lang: page.lang,
    themeMode: config.theme.mode,
    pageTitle: page.title,
    pageDescription: page.description,
    header: renderedHeader,
    footer: renderedFooter,
    menu: renderedMenu,
    route: page.route
  }

  return renderTemplate(homeTemplate, templateContext)
}

export function writeOutput({ rootDir, config, renderedPages }: WritePayload): { outDir: string; pages: number } {
  const outDir = path.resolve(rootDir, config.build.outDir)
  fs.rmSync(outDir, { recursive: true, force: true })
  ensureDir(outDir)

  for (const page of renderedPages) {
    const outFile = routeToOutputFile(page.route, outDir, config.routing.trailingSlash)
    ensureDir(path.dirname(outFile))
    fs.writeFileSync(outFile, page.html, 'utf-8')
  }

  return { outDir, pages: renderedPages.length }
}

export async function buildSite(options: BuildOptions = {}): Promise<BuildResult> {
  const rootDir = path.resolve(options.rootDir ?? process.cwd())
  const plugins = options.plugins ?? []

  const { config } = loadConfig({ rootDir, configPath: options.configPath ?? 'config.json' })

  let pages = scanContent({ rootDir, config })
  if (pages.length === 0) {
    return { pages: 0, warnings: ['No markdown files found.'], routes: [] }
  }

  pages = await applyHookPlugins(plugins, 'beforeParse', pages)
  let parsedPages = pages.map((page) => transformParsedPage(page, config))
  parsedPages = await applyHookPlugins(plugins, 'afterParse', parsedPages)

  parsedPages = resolveRoutes({ pages: parsedPages, config })
  const warnings: string[] = []
  const layoutDirs = resolveLayoutDirs(rootDir, config)

  const renderedPages: RenderedPage[] = []
  for (const page of parsedPages) {
    if (page.draft && process.env.NODE_ENV === 'production') {
      continue
    }

    let pageVariants: ParsedPage[] = [page]
    if (config.i18n.enabled && config.i18n.mode === 'prefixed-path') {
      pageVariants = config.i18n.locales.map((locale) => ({
        ...page,
        lang: locale,
        route: page.route === '/' ? `/${locale}` : `/${locale}${page.route}`
      }))
    }

    for (const variant of pageVariants) {
      let variantPayload = await applyHookPlugins(plugins, 'beforeRender', variant)
      const html = renderPageHtml({ page: variantPayload, config, layoutDirs, warnings })
      let renderedVariant: RenderedPage = { ...variantPayload, html }
      renderedVariant = await applyHookPlugins(plugins, 'afterRender', renderedVariant)
      renderedPages.push(renderedVariant)
    }
  }

  let writePayload: WritePayload = { rootDir, config, renderedPages }
  writePayload = await applyHookPlugins(plugins, 'beforeWrite', writePayload)
  const written = writeOutput(writePayload)

  return {
    pages: written.pages,
    outDir: written.outDir,
    warnings,
    routes: renderedPages.map((page) => page.route)
  }
}

export function createGenerator(options: BuildOptions = {}): { build: (overrides?: BuildOptions) => Promise<BuildResult> } {
  return {
    build: (overrides: BuildOptions = {}) => buildSite({ ...options, ...overrides })
  }
}
