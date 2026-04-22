import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import type { AeicoPageConfig } from './types.js'
import { DEFAULTS } from './types.js'

function readJson(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

export function mergeConfig(userConfig: Partial<AeicoPageConfig>): AeicoPageConfig {
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

export function loadConfig({
  rootDir = process.cwd(),
  configPath = 'config.json'
}: {
  rootDir?: string
  configPath?: string
} = {}): { config: AeicoPageConfig; configPath: string } {
  const resolvedPath = path.resolve(rootDir, configPath)
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`config.json not found: ${resolvedPath}`)
  }
  return {
    config: mergeConfig(readJson(resolvedPath) as Partial<AeicoPageConfig>),
    configPath: resolvedPath
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

export function resolveIncludes(siteRoot: string): Record<string, string> {
  const result: Record<string, string> = {}

  const themeIncludesDir = getDefaultThemeIncludesDir()
  if (fs.existsSync(themeIncludesDir)) {
    for (const entry of fs.readdirSync(themeIncludesDir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.html')) {
        const key = entry.name.slice(0, -5).replace(/-/g, '_')
        result[key] = fs.readFileSync(path.join(themeIncludesDir, entry.name), 'utf-8')
      }
    }
  }

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
