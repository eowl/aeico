import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

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
}

type RoutingConfig = {
  trailingSlash: TrailingSlashMode
  cleanIndex: boolean
  slugify: SlugifyMode
}

type BuildConfig = {
  outDir: string
}

type DevConfig = {
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
  draft: boolean
}

type RenderedPage = ParsedPage & {
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

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/
const RESERVED_SLUGS = new Set(['config', 'assets'])

const DEFAULTS: AeicoPageConfig = {
  site: { title: 'aeico-page', description: '', base: '/', origin: '' },
  content: { rootDir: '_pages' },
  routing: { trailingSlash: 'always', cleanIndex: true, slugify: 'lower' },
  build: { outDir: 'dist' },
  dev: { port: 4173, open: false }
}

function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true })
}

function readJson(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

function mergeConfig(userConfig: Partial<AeicoPageConfig>): AeicoPageConfig {
  const c = userConfig ?? {}
  return {
    ...DEFAULTS,
    ...c,
    site: { ...DEFAULTS.site, ...(c.site ?? {}) },
    content: { ...DEFAULTS.content, ...(c.content ?? {}) },
    routing: { ...DEFAULTS.routing, ...(c.routing ?? {}) },
    build: { ...DEFAULTS.build, ...(c.build ?? {}) },
    dev: { ...DEFAULTS.dev, ...(c.dev ?? {}) }
  }
}

export function getDefaultThemeLayoutDir(): string {
  return fileURLToPath(new URL('../theme/layout/', import.meta.url))
}

export function getDefaultThemeAssetsDir(): string {
  return fileURLToPath(new URL('../theme/assets/', import.meta.url))
}

export function getDefaultThemeIncludesDir(): string {
  return fileURLToPath(new URL('../theme/includes/', import.meta.url))
}

/**
 * Resolve includes: theme defaults merged with user overrides from <siteRoot>/_includes/.
 * Returns a Record where key = filename without .html extension, value = file content.
 */
export function resolveIncludes(siteRoot: string): Record<string, string> {
  const result: Record<string, string> = {}

  // 1. Load theme defaults
  const themeIncludesDir = getDefaultThemeIncludesDir()
  if (fs.existsSync(themeIncludesDir)) {
    for (const entry of fs.readdirSync(themeIncludesDir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.html')) {
        const key = entry.name.slice(0, -5).replace(/-/g, '_')
        result[key] = fs.readFileSync(path.join(themeIncludesDir, entry.name), 'utf-8')
      }
    }
  }

  // 2. User overrides take precedence
  const userIncludesDir = path.resolve(siteRoot, '_includes')
  if (fs.existsSync(userIncludesDir)) {
    for (const entry of fs.readdirSync(userIncludesDir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.html')) {
        const key = entry.name.slice(0, -5).replace(/-/g, '_')
        result[key] = fs.readFileSync(path.join(userIncludesDir, entry.name), 'utf-8').replace(/^\uFEFF/, '')
      }
    }
  }

  return result
}

export function loadConfig({ rootDir = process.cwd(), configPath = 'config.json' }: { rootDir?: string; configPath?: string } = {}): {
  config: AeicoPageConfig
  configPath: string
} {
  const resolvedPath = path.resolve(rootDir, configPath)
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`config.json not found: ${resolvedPath}`)
  }
  return { config: mergeConfig(readJson(resolvedPath) as Partial<AeicoPageConfig>), configPath: resolvedPath }
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
    return 'Home'
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

function renderTemplate(template: string, context: Record<string, unknown>): string {
  return template.replace(/{{\s*([a-zA-Z0-9_.]+)\s*}}/g, (_, keyPath: string) => {
    const value = keyPath.split('.').reduce<unknown>((acc, key) => {
      if (typeof acc === 'object' && acc !== null && key in acc) {
        return (acc as Record<string, unknown>)[key]
      }
      return undefined
    }, context)
    return value == null ? '' : String(value)
  })
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// ─── Site Tree ──────────────────────────────────────────────────────────────

export function buildSiteTree(
  parsedPages: Array<{ title: string; route: string; relativePath: string }>
): SiteTree {
  const home = parsedPages.find((p) => p.route === '/') ?? null
  const sectionMap = new Map<string, SitePage[]>()

  for (const page of parsedPages) {
    if (page.route === '/') continue
    const segments = page.route.split('/').filter(Boolean)
    const sectionName = segments[0]
    // Root-level files (about.md -> /about) have no parent dir: skip navbar
    const hasDir = page.relativePath.includes('/') || page.relativePath.includes('\\')
    if (!hasDir) continue

    if (!sectionMap.has(sectionName)) sectionMap.set(sectionName, [])
    sectionMap.get(sectionName)!.push({
      title: page.title,
      route: page.route,
      relativePath: page.relativePath
    })
  }

  const sections: SiteSection[] = []
  for (const [name, pages] of sectionMap) {
    pages.sort((a, b) => {
      if (a.route === `/${name}`) return -1
      if (b.route === `/${name}`) return 1
      return a.route.localeCompare(b.route)
    })
    const hasIndex = pages.some((p) => p.route === `/${name}`)
    const entryRoute = hasIndex ? `/${name}` : pages[0].route
    sections.push({ name, entryRoute, pages })
  }

  return {
    home: home ? { title: home.title, route: '/', relativePath: home.relativePath } : null,
    sections
  }
}

// ─── Navbar / Sidebar HTML ──────────────────────────────────────────────────

export function generateNavbarHtml(tree: SiteTree, currentRoute: string, siteTitle: string): string {
  const segs = currentRoute.split('/').filter(Boolean)
  const currentSection =
    segs.length > 0 && tree.sections.some((s) => s.name === segs[0]) ? segs[0] : null

  const homeActive = currentRoute === '/'

  const navLinks = [
    `<a href="/" class="ap-nav-link${homeActive ? ' ap-active' : ''}">Home</a>`,
    ...tree.sections.map((section) => {
      const isActive = currentSection === section.name
      return `<a href="${section.entryRoute}" class="ap-nav-link${isActive ? ' ap-active' : ''}">${capitalize(section.name)}</a>`
    })
  ].join('\n    ')

  return `<nav class="ap-navbar">
  <a href="/" class="ap-brand">${escapeHtml(siteTitle)}</a>
  <div class="ap-nav-links">
    ${navLinks}
  </div>
</nav>`
}

export function generateSidebarHtml(tree: SiteTree, currentRoute: string): string {
  const segs = currentRoute.split('/').filter(Boolean)
  if (segs.length === 0) return ''

  const sectionName = segs[0]
  const section = tree.sections.find((s) => s.name === sectionName)
  if (!section) return ''

  const items = section.pages
    .map((page) => {
      const isActive = page.route === currentRoute
      return `<li><a href="${page.route}" class="ap-sidebar-link${isActive ? ' ap-active' : ''}">${escapeHtml(page.title)}</a></li>`
    })
    .join('\n    ')

  return `<aside class="ap-sidebar">
  <ul>
    ${items}
  </ul>
</aside>`
}

export function scanContent({ rootDir, config }: { rootDir: string; config: AeicoPageConfig }): ParsedInputPage[] {
  const contentDir = path.resolve(rootDir, config.content.rootDir)
  return walkMarkdownFiles(contentDir).map((absPath) => ({
    absPath,
    relativePath: path.relative(contentDir, absPath),
    source: fs.readFileSync(absPath, 'utf-8').replace(/^\uFEFF/, '')
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

function transformParsedPage(page: ParsedInputPage, _config: AeicoPageConfig): ParsedPage {
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
    draft: frontmatter.draft === true
  }
}

function renderPageHtml({
  page,
  config,
  tree,
  layoutTemplate,
  includes
}: {
  page: ParsedPage
  config: AeicoPageConfig
  tree: SiteTree
  layoutTemplate: string
  includes: Record<string, string>
}): string {
  const navbar = generateNavbarHtml(tree, page.route, config.site.title)
  const sidebar = generateSidebarHtml(tree, page.route)
  return renderTemplate(layoutTemplate, {
    page: { title: page.title, description: page.description, route: page.route },
    site: config.site,
    navbar,
    sidebar,
    content: markdownToHtml(page.content),
    include: includes
  })
}

export function writeOutput({
  rootDir,
  config,
  renderedPages
}: {
  rootDir: string
  config: AeicoPageConfig
  renderedPages: RenderedPage[]
}): { outDir: string; pages: number } {
  const outDir = path.resolve(rootDir, config.build.outDir)
  fs.rmSync(outDir, { recursive: true, force: true })
  ensureDir(outDir)

  for (const page of renderedPages) {
    const outFile = routeToOutputFile(page.route, outDir, config.routing.trailingSlash)
    ensureDir(path.dirname(outFile))
    fs.writeFileSync(outFile, page.html, 'utf-8')
  }

  // Copy static assets from default theme
  const assetsDir = getDefaultThemeAssetsDir()
  const outAssetsDir = path.join(outDir, 'assets')
  for (const name of ['style.css']) {
    const src = path.join(assetsDir, name)
    if (fs.existsSync(src)) {
      ensureDir(outAssetsDir)
      fs.copyFileSync(src, path.join(outAssetsDir, name))
    }
  }

  return { outDir, pages: renderedPages.length }
}

export async function buildSite(options: BuildOptions = {}): Promise<BuildResult> {
  const rootDir = path.resolve(options.rootDir ?? process.cwd())

  const { config } = loadConfig({ rootDir, configPath: options.configPath ?? 'config.json' })

  let inputPages = scanContent({ rootDir, config })
  if (inputPages.length === 0) {
    return { pages: 0, warnings: [`No markdown files found in ${config.content.rootDir}/`], routes: [] }
  }

  let parsedPages = inputPages.map((page) => transformParsedPage(page, config))
  parsedPages = resolveRoutes({ pages: parsedPages, config })

  if (process.env.NODE_ENV === 'production') {
    parsedPages = parsedPages.filter((p) => !p.draft)
  }

  const tree = buildSiteTree(parsedPages)

  const layoutDir = getDefaultThemeLayoutDir()
  const layoutFile = path.join(layoutDir, 'home.html')
  if (!fs.existsSync(layoutFile)) {
    throw new Error(`Default theme layout not found: ${layoutFile}`)
  }
  const layoutTemplate = fs.readFileSync(layoutFile, 'utf-8')
  const includes = resolveIncludes(rootDir)

  const warnings: string[] = []
  const renderedPages: RenderedPage[] = parsedPages.map((page) => ({
    ...page,
    html: renderPageHtml({ page, config, tree, layoutTemplate, includes })
  }))

  const written = writeOutput({ rootDir, config, renderedPages })

  return {
    pages: written.pages,
    outDir: written.outDir,
    warnings,
    routes: renderedPages.map((p) => p.route)
  }
}

export function createGenerator(options: BuildOptions = {}): { build: (overrides?: BuildOptions) => Promise<BuildResult> } {
  return {
    build: (overrides: BuildOptions = {}) => buildSite({ ...options, ...overrides })
  }
}
