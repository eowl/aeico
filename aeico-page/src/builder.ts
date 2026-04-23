import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import type { BuildOptions, BuildResult, RenderedPage } from './types.js'
import { loadConfig, getDefaultThemeLayoutDir, resolveIncludes } from './config.js'
import { scanContent, transformPage, resolveRoutes, buildSiteTree } from './scanner.js'
import { renderPageHtml, writeOutput } from './renderer.js'

export async function buildSite(options: BuildOptions = {}): Promise<BuildResult> {
  const rootDir = path.resolve(options.rootDir ?? process.cwd())
  const { config } = loadConfig({ rootDir, configPath: options.configPath ?? 'config.json' })

  const inputPages = scanContent({ rootDir, config })
  if (inputPages.length === 0) {
    return { pages: 0, warnings: [`No markdown files found in ${config.content.rootDir}/`], routes: [] }
  }

  let parsedPages = inputPages.map((page) => transformPage(page, config))
  parsedPages = resolveRoutes({ pages: parsedPages, config })

  if (process.env.NODE_ENV === 'production') {
    parsedPages = parsedPages.filter((p) => !p.draft)
  }

  const tree = buildSiteTree(parsedPages)

  // Meta pages (_meta.md) are not rendered to HTML
  const renderablePages = parsedPages.filter((p) => !p.isMeta)

  const layoutDir = getDefaultThemeLayoutDir()
  const layoutCache = new Map<string, string>()

  function loadLayout(name: string): string {
    if (layoutCache.has(name)) return layoutCache.get(name)!
    const layoutFile = path.join(layoutDir, `${name}.html`)
    if (!fs.existsSync(layoutFile)) {
      throw new Error(`Layout not found: ${name}.html (looked in ${layoutDir})`)
    }
    const template = fs.readFileSync(layoutFile, 'utf-8')
    layoutCache.set(name, template)
    return template
  }

  const includes = resolveIncludes(rootDir)

  const renderedPages: RenderedPage[] = renderablePages.map((page) => ({
    ...page,
    html: renderPageHtml({ page, config, tree, layoutTemplate: loadLayout(page.layout), includes })
  }))

  const written = writeOutput({ rootDir, config, renderedPages })

  return {
    pages: written.pages,
    outDir: written.outDir,
    warnings: [],
    routes: renderedPages.map((p) => p.route)
  }
}

export function createGenerator(
  options: BuildOptions = {}
): { build: (overrides?: BuildOptions) => Promise<BuildResult> } {
  return {
    build: (overrides: BuildOptions = {}) => buildSite({ ...options, ...overrides })
  }
}
