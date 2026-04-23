import fs from 'node:fs'
import path from 'node:path'
import type {
  AeicoPageConfig,
  ParsedInputPage,
  ParsedPage,
  MetaLink,
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
  const lines = match[1].split('\n')
  let i = 0

  function parseScalar(raw: string): unknown {
    const v = raw.trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1)
    if (v === 'true') return true
    if (v === 'false') return false
    if (v === 'null' || v === '~') return null
    if (/^-?\d+$/.test(v)) return Number(v)
    if (/^-?\d+\.\d+$/.test(v)) return Number(v)
    return v
  }

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) { i++; continue }

    const idx = trimmed.indexOf(':')
    if (idx <= 0) { i++; continue }

    const key = trimmed.slice(0, idx).trim()
    const rest = trimmed.slice(idx + 1).trim()

    if (rest === '') {
      // Could be a block: list items follow as "  - ..." lines
      const items: Record<string, unknown>[] = []
      i++
      while (i < lines.length) {
        const next = lines[i]
        const nextTrimmed = next.trim()
        if (!nextTrimmed || nextTrimmed.startsWith('#')) { i++; continue }
        // List item start
        if (!nextTrimmed.startsWith('-')) break
        const itemLine = nextTrimmed.slice(1).trim()
        const item: Record<string, unknown> = {}
        // First field on the same line
        const firstColon = itemLine.indexOf(':')
        if (firstColon > 0) {
          item[itemLine.slice(0, firstColon).trim()] = parseScalar(itemLine.slice(firstColon + 1))
        }
        i++
        // Continuation fields with deeper indent
        while (i < lines.length) {
          const cont = lines[i]
          if (!cont.trim() || cont.trim().startsWith('-') || cont.trim().startsWith('#')) break
          const contColon = cont.indexOf(':')
          if (contColon > 0) {
            const contKey = cont.slice(0, contColon).trim()
            const contVal = parseScalar(cont.slice(contColon + 1))
            item[contKey] = contVal
          }
          i++
        }
        items.push(item)
      }
      data[key] = items
      continue
    }

    data[key] = parseScalar(rest)
    i++
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
  const isMeta = path.basename(page.relativePath) === '_meta.md'

  if (!isMeta && frontmatter.date !== undefined && Number.isNaN(Date.parse(String(frontmatter.date)))) {
    throw new Error(`Invalid date in frontmatter: ${page.absPath}`)
  }

  return {
    ...page,
    frontmatter,
    content: parsed.content,
    route: '',
    title: String(frontmatter.title ?? inferTitle(page.relativePath.replace(/\.md$/i, ''))),
    description: String(frontmatter.description ?? ''),
    draft: frontmatter.draft === true,
    isMeta,
    layout: isMeta ? '' : String(frontmatter.layout ?? 'default')
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
    if (page.isMeta) {
      page.route = ''
      continue
    }
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
  parsedPages: Array<{ title: string; route: string; relativePath: string; isMeta: boolean; frontmatter: Record<string, unknown> }>
): SiteTree {
  const home = parsedPages.find((p) => p.route === '/') ?? null

  // Build a lookup from dir prefix (normalized) → meta frontmatter
  const metaMap = new Map<string, Record<string, unknown>>()
  for (const page of parsedPages) {
    if (!page.isMeta) continue
    const dir = path.dirname(page.relativePath).replace(/\\/g, '/')
    metaMap.set(dir, page.frontmatter)
  }

  // Only non-meta, non-home pages go into sections
  const sectionPages = parsedPages.filter(
    (p) => !p.isMeta && p.route !== '/'
  )

  // Collect top-level section names from content pages AND from top-level meta files
  const topNamesFromPages = sectionPages.map((p) => p.route.split('/').filter(Boolean)[0])
  const topNamesFromMeta = [...metaMap.keys()]
    .filter((dir) => !dir.includes('/'))  // only top-level dirs (e.g. "test", not "blog/2024")
    .filter((dir) => dir !== '.')
  const topNames = [...new Set([...topNamesFromPages, ...topNamesFromMeta])]

  function firstRoute(section: SiteSection): string {
    if (section.index) return section.index.route
    if (section.pages.length > 0) return section.pages[0].route
    for (const sub of section.sections) {
      const r = firstRoute(sub)
      if (r) return r
    }
    return ''
  }

  function buildSection(prefix: string): SiteSection {
    const name = prefix.split('/').at(-1)!
    const meta = metaMap.get(prefix)
    const title = meta?.title ? String(meta.title) : name.charAt(0).toUpperCase() + name.slice(1)

    // Parse links array from _meta.md frontmatter
    const rawLinks = Array.isArray(meta?.links) ? meta.links : []
    const links: MetaLink[] = rawLinks
      .filter((l): l is Record<string, unknown> => typeof l === 'object' && l !== null)
      .map((l) => ({ title: String(l.title ?? ''), url: String(l.url ?? '') }))
      .filter((l) => l.url)

    // Direct child pages whose relativePath parent dir equals prefix
    const directPages = sectionPages.filter((p) => {
      const rel = p.relativePath.replace(/\\/g, '/')
      const dir = rel.split('/').slice(0, -1).join('/')
      const filename = rel.split('/').at(-1)!
      return dir === prefix && filename !== 'index.md'
    })

    // index.md in this dir
    const indexPage = sectionPages.find((p) => {
      const rel = p.relativePath.replace(/\\/g, '/')
      const dir = rel.split('/').slice(0, -1).join('/')
      return dir === prefix && rel.endsWith('/index.md')
    }) ?? null

    // Immediate subdirectories
    const subDirNames = [...new Set(
      sectionPages
        .filter((p) => {
          const rel = p.relativePath.replace(/\\/g, '/')
          const parts = rel.split('/')
          return parts.length > prefix.split('/').length + 1 && parts.slice(0, prefix.split('/').length).join('/') === prefix
        })
        .map((p) => {
          const rel = p.relativePath.replace(/\\/g, '/')
          return rel.split('/')[prefix.split('/').length]
        })
    )]

    const pages: SitePage[] = directPages
      .sort((a, b) => a.route.localeCompare(b.route))
      .map((p) => ({ title: p.title, route: p.route, relativePath: p.relativePath }))

    const subsections = subDirNames
      .map((sub) => buildSection(`${prefix}/${sub}`))
      .sort((a, b) => a.name.localeCompare(b.name))

    const section: SiteSection = {
      name,
      title,
      entryRoute: '',
      links,
      index: indexPage ? { title: indexPage.title, route: indexPage.route, relativePath: indexPage.relativePath } : null,
      pages,
      sections: subsections
    }
    section.entryRoute = meta?.link ? String(meta.link) : firstRoute(section)
    return section
  }

  const sections = topNames
    .map((name) => buildSection(name))
    .sort((a, b) => a.name.localeCompare(b.name))

  return {
    home: home ? { title: home.title, route: '/', relativePath: home.relativePath } : null,
    sections
  }
}
