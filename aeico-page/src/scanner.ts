import fs from 'node:fs'
import path from 'node:path'
import type {
  AeicoPageConfig,
  ParsedInputPage,
  ParsedPage,
  SitePage,
  SiteSection,
  SiteTree,
  SlugifyMode,
  RoutingConfig
} from './types.js'
import { FRONTMATTER_RE, RESERVED_SLUGS } from './types.js'

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
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf(':')
    if (idx <= 0) continue
    const key = trimmed.slice(0, idx).trim()
    let value = trimmed.slice(idx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (value === 'true') data[key] = true
    else if (value === 'false') data[key] = false
    else if (/^\d+$/.test(value)) data[key] = Number(value)
    else data[key] = value
  }

  return { data, content: markdown.slice(match[0].length) }
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
  if (!name || name === 'index') return 'Home'
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

export function scanContent({
  rootDir,
  config
}: {
  rootDir: string
  config: AeicoPageConfig
}): ParsedInputPage[] {
  const contentDir = path.resolve(rootDir, config.content.rootDir)
  return walkMarkdownFiles(contentDir).map((absPath) => ({
    absPath,
    relativePath: path.relative(contentDir, absPath),
    source: fs.readFileSync(absPath, 'utf-8').replace(/^\uFEFF/, '')
  }))
}

export function transformPage(page: ParsedInputPage, _config: AeicoPageConfig): ParsedPage {
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

export function resolveRoutes({
  pages,
  config
}: {
  pages: ParsedPage[]
  config: AeicoPageConfig
}): ParsedPage[] {
  const routeSet = new Set<string>()
  for (const page of pages) {
    const route = relativeMdToRoute(page.relativePath, config.routing)
    validateRoute(route)
    const key = route.toLowerCase()
    if (routeSet.has(key)) throw new Error(`Route conflict detected: ${route}`)
    routeSet.add(key)
    page.route = route
  }
  return pages
}

export function buildSiteTree(
  parsedPages: Array<{ title: string; route: string; relativePath: string }>
): SiteTree {
  const home = parsedPages.find((p) => p.route === '/') ?? null
  const sectionMap = new Map<string, SitePage[]>()

  for (const page of parsedPages) {
    if (page.route === '/') continue
    const segments = page.route.split('/').filter(Boolean)
    const sectionName = segments[0]
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
