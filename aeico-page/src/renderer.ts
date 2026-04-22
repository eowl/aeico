import fs from 'node:fs'
import path from 'node:path'
import type { AeicoPageConfig, ParsedPage, RenderedPage, SiteTree, TrailingSlashMode } from './types.js'
import { getDefaultThemeAssetsDir } from './config.js'

function escapeHtml(text: unknown): string {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function markdownToHtml(markdown: string): string {
  const lines = markdown.replaceAll('\r\n', '\n').split('\n')
  const html: string[] = []
  let paragraphBuffer: string[] = []

  function flushParagraph(): void {
    if (paragraphBuffer.length === 0) return
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

export function renderTemplate(template: string, context: Record<string, unknown>): string {
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

function routeToOutputFile(route: string, outDir: string, trailingSlash: TrailingSlashMode): string {
  const normalized = route === '/' ? '' : route.replace(/^\//, '')
  if (trailingSlash === 'never') {
    const fileName = normalized ? `${normalized}.html` : 'index.html'
    return path.join(outDir, fileName)
  }
  return path.join(outDir, normalized, 'index.html')
}

export function renderPageHtml({
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
  const treeJson = JSON.stringify(tree).replaceAll("'", '&#39;')
  const currentSection = page.route.split('/').filter(Boolean)[0] ?? ''

  return renderTemplate(layoutTemplate, {
    page: { title: page.title, description: page.description, route: page.route },
    site: config.site,
    tree_json: treeJson,
    current_route: page.route,
    current_section: currentSection,
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
  fs.mkdirSync(outDir, { recursive: true })

  for (const page of renderedPages) {
    const outFile = routeToOutputFile(page.route, outDir, config.routing.trailingSlash)
    fs.mkdirSync(path.dirname(outFile), { recursive: true })
    fs.writeFileSync(outFile, page.html, 'utf-8')
  }

  const assetsDir = getDefaultThemeAssetsDir()
  const outAssetsDir = path.join(outDir, 'assets')
  for (const name of ['style.css', 'components.js']) {
    const src = path.join(assetsDir, name)
    if (fs.existsSync(src)) {
      fs.mkdirSync(outAssetsDir, { recursive: true })
      fs.copyFileSync(src, path.join(outAssetsDir, name))
    }
  }

  return { outDir, pages: renderedPages.length }
}
