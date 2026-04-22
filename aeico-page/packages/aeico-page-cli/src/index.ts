#!/usr/bin/env node
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import process from 'node:process'
import {
  buildSite,
  loadConfig
} from '../../aeico-page-core/dist/index.js'

type CliArgs = {
  command: string
  site: string
  config: string
}

function parseArgs(argv: string[]): CliArgs {
  const [command = 'build', ...rest] = argv
  const options: CliArgs = { command, site: process.cwd(), config: 'config.json' }

  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i]
    if (token === '--site') {
      options.site = path.resolve(rest[i + 1])
      i += 1
      continue
    }
    if (token === '--config') {
      options.config = rest[i + 1]
      i += 1
      continue
    }
  }

  return options
}

async function runBuild(siteRoot: string, configPath: string): Promise<void> {
  const result = await buildSite({ rootDir: siteRoot, configPath })
  for (const warning of result.warnings) {
    console.warn(`[aeico-page] warning: ${warning}`)
  }
  console.log(`[aeico-page] build finished, pages: ${result.pages}`)
}

function runDev(siteRoot: string, configPath: string): void {
  const { config } = loadConfig({ rootDir: siteRoot, configPath })
  const outDir = path.resolve(siteRoot, config.build.outDir)
  const port = config.dev.port || 4173

  const schedule = (() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    return () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(async () => {
        try {
          await runBuild(siteRoot, configPath)
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          console.error(`[aeico-page] build failed: ${message}`)
        }
      }, 120)
    }
  })()

  const targets = [
    path.resolve(siteRoot, config.content.rootDir),
    path.resolve(siteRoot, '_includes'),
    path.resolve(siteRoot, configPath)
  ]

  void runBuild(siteRoot, configPath)

  for (const target of targets) {
    if (!fs.existsSync(target)) continue
    fs.watch(target, { recursive: true }, schedule)
  }

  const server = http.createServer((req, res) => {
    const requestPath = decodeURIComponent((req.url || '/').split('?')[0])
    const normalized = requestPath === '/' ? '/index.html' : requestPath

    const candidates = [
      path.join(outDir, normalized),
      path.join(outDir, normalized, 'index.html'),
      path.join(outDir, normalized.replace(/\/$/, ''), 'index.html')
    ]

    const filePath = candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile())
    if (!filePath) {
      res.statusCode = 404
      res.end('Not Found')
      return
    }

    const contentType = filePath.endsWith('.html')
      ? 'text/html; charset=utf-8'
      : filePath.endsWith('.js')
        ? 'application/javascript; charset=utf-8'
        : filePath.endsWith('.css')
          ? 'text/css; charset=utf-8'
          : 'text/plain; charset=utf-8'

    res.setHeader('content-type', contentType)
    fs.createReadStream(filePath).pipe(res)
  })

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[aeico-page] port ${port} is already in use`)
    } else {
      console.error(`[aeico-page] server error: ${err.message}`)
    }
    process.exitCode = 1
  })

  server.listen(port, () => {
    console.log(`[aeico-page] dev server at http://localhost:${port}`)
  })
}

function runPreview(siteRoot: string, configPath: string): void {
  const { config } = loadConfig({ rootDir: siteRoot, configPath })
  const outDir = path.resolve(siteRoot, config.build.outDir)
  const port = config.dev.port || 4173

  const server = http.createServer((req, res) => {
    const requestPath = decodeURIComponent((req.url || '/').split('?')[0])
    const normalized = requestPath === '/' ? '/index.html' : requestPath

    const candidates = [
      path.join(outDir, normalized),
      path.join(outDir, normalized, 'index.html'),
      path.join(outDir, normalized.replace(/\/$/, ''), 'index.html')
    ]

    const filePath = candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile())
    if (!filePath) {
      res.statusCode = 404
      res.end('Not Found')
      return
    }

    const contentType = filePath.endsWith('.html')
      ? 'text/html; charset=utf-8'
      : filePath.endsWith('.js')
        ? 'application/javascript; charset=utf-8'
        : filePath.endsWith('.css')
          ? 'text/css; charset=utf-8'
          : 'text/plain; charset=utf-8'

    res.setHeader('content-type', contentType)
    fs.createReadStream(filePath).pipe(res)
  })

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[aeico-page] port ${port} is already in use`)
    } else {
      console.error(`[aeico-page] server error: ${err.message}`)
    }
    process.exitCode = 1
  })

  server.listen(port, () => {
    console.log(`[aeico-page] preview at http://localhost:${port}`)
  })
}

function ensureFileIfMissing(filePath: string, content: string): void {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content, 'utf-8')
  }
}

function runInit(siteRoot: string): void {
  fs.mkdirSync(siteRoot, { recursive: true })

  fs.mkdirSync(path.join(siteRoot, '_pages', 'docs'), { recursive: true })
  fs.mkdirSync(path.join(siteRoot, '_pages', 'blog'), { recursive: true })

  ensureFileIfMissing(
    path.join(siteRoot, 'config.json'),
    JSON.stringify(
      {
        site: {
          title: 'My Site',
          description: 'A markdown-first static site'
        },
        build: { outDir: 'dist' }
      },
      null,
      2
    )
  )

  ensureFileIfMissing(
    path.join(siteRoot, '_pages', 'index.md'),
    '# Welcome\n\nThis is the home page of your aeico-page site.\n'
  )

  ensureFileIfMissing(
    path.join(siteRoot, '_pages', 'docs', 'getting-started.md'),
    '---\ntitle: Getting Started\n---\n\n# Getting Started\n\nAdd your documentation here.\n'
  )

  ensureFileIfMissing(
    path.join(siteRoot, '_pages', 'blog', 'hello-world.md'),
    '---\ntitle: Hello World\n---\n\n# Hello World\n\nYour first blog post.\n'
  )

  console.log(`[aeico-page] initialized site in ${siteRoot}`)
}

export async function runCli(argv = process.argv.slice(2)): Promise<void> {
  const args = parseArgs(argv)

  if (args.command === 'build') {
    await runBuild(args.site, args.config)
    return
  }
  if (args.command === 'dev') {
    runDev(args.site, args.config)
    return
  }
  if (args.command === 'preview') {
    runPreview(args.site, args.config)
    return
  }
  if (args.command === 'init') {
    runInit(args.site)
    return
  }

  throw new Error(`unknown command: ${args.command}`)
}

async function main(): Promise<void> {
  try {
    await runCli()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[aeico-page] ${message}`)
    process.exitCode = 1
  }
}

void main()
