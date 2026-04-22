#!/usr/bin/env node
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';
import {
  buildSite,
  getDefaultThemeLayoutDir,
  loadConfig
} from '../../aeico-page-core/src/index.mjs';

function parseArgs(argv) {
  const [command = 'build', ...rest] = argv;
  const options = { command, site: process.cwd(), config: 'config.json' };

  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (token === '--site') {
      options.site = path.resolve(rest[i + 1]);
      i += 1;
      continue;
    }
    if (token === '--config') {
      options.config = rest[i + 1];
      i += 1;
      continue;
    }
  }

  return options;
}

async function runBuild(siteRoot, configPath) {
  const result = await buildSite({ rootDir: siteRoot, configPath });
  for (const warning of result.warnings) {
    console.warn(`[aeico-page] warning: ${warning}`);
  }
  console.log(`[aeico-page] build finished, pages: ${result.pages}`);
}

function runDev(siteRoot, configPath) {
  const schedule = (() => {
    let timer = null;
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(async () => {
        try {
          await runBuild(siteRoot, configPath);
        } catch (error) {
          console.error(`[aeico-page] build failed: ${error.message}`);
        }
      }, 120);
    };
  })();

  const { config } = loadConfig({ rootDir: siteRoot, configPath });
  const targets = [
    path.resolve(siteRoot, config.content.rootDir),
    path.resolve(siteRoot, config.layout.rootDir),
    path.resolve(siteRoot, configPath)
  ];

  runBuild(siteRoot, configPath);

  for (const target of targets) {
    if (!fs.existsSync(target)) {
      continue;
    }
    fs.watch(target, { recursive: true }, schedule);
  }

  console.log(`[aeico-page] dev watching in ${siteRoot}`);
}

function runPreview(siteRoot, configPath) {
  const { config } = loadConfig({ rootDir: siteRoot, configPath });
  const outDir = path.resolve(siteRoot, config.build.outDir);
  const port = config.dev.port || 4173;

  const server = http.createServer((req, res) => {
    const requestPath = decodeURIComponent((req.url || '/').split('?')[0]);
    const normalized = requestPath === '/' ? '/index.html' : requestPath;

    const candidates = [
      path.join(outDir, normalized),
      path.join(outDir, normalized, 'index.html'),
      path.join(outDir, normalized.replace(/\/$/, ''), 'index.html')
    ];

    const filePath = candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
    if (!filePath) {
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }

    const contentType = filePath.endsWith('.html')
      ? 'text/html; charset=utf-8'
      : 'text/plain; charset=utf-8';

    res.setHeader('content-type', contentType);
    fs.createReadStream(filePath).pipe(res);
  });

  server.listen(port, () => {
    console.log(`[aeico-page] preview at http://localhost:${port}`);
  });
}

function ensureFileIfMissing(filePath, content) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }
}

function runInit(siteRoot) {
  fs.mkdirSync(siteRoot, { recursive: true });

  const contentDir = path.join(siteRoot, 'content', 'chapter_1');
  fs.mkdirSync(contentDir, { recursive: true });
  const layoutDir = path.join(siteRoot, 'layout');
  fs.mkdirSync(layoutDir, { recursive: true });

  ensureFileIfMissing(
    path.join(siteRoot, 'config.json'),
    JSON.stringify(
      {
        site: {
          title: 'aeico-page site',
          description: 'A markdown-first static site',
          base: '/',
          origin: 'http://localhost:4173'
        },
        content: { rootDir: 'content' },
        layout: { rootDir: 'layout', defaultLayout: 'home' },
        i18n: { enabled: true, mode: 'same-path', defaultLocale: 'zh-CN', locales: ['zh-CN', 'en-US'] }
      },
      null,
      2
    )
  );

  ensureFileIfMissing(
    path.join(contentDir, 'hello.md'),
    '# Hello\n\nThis site was initialized by aeico-page.'
  );

  const defaultLayoutDir = getDefaultThemeLayoutDir();
  const layoutFiles = ['home.md', 'header.md', 'menu.md', 'footer.md'];
  for (const fileName of layoutFiles) {
    const src = path.join(defaultLayoutDir, fileName);
    const dst = path.join(layoutDir, fileName);
    if (!fs.existsSync(dst) && fs.existsSync(src)) {
      fs.copyFileSync(src, dst);
    }
  }

  console.log(`[aeico-page] initialized site in ${siteRoot}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  try {
    if (args.command === 'build') {
      await runBuild(args.site, args.config);
      return;
    }
    if (args.command === 'dev') {
      runDev(args.site, args.config);
      return;
    }
    if (args.command === 'preview') {
      runPreview(args.site, args.config);
      return;
    }
    if (args.command === 'init') {
      runInit(args.site);
      return;
    }

    console.error(`[aeico-page] unknown command: ${args.command}`);
    process.exitCode = 1;
  } catch (error) {
    console.error(`[aeico-page] ${error.message}`);
    process.exitCode = 1;
  }
}

main();
