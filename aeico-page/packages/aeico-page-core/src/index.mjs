import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?/;
const RESERVED_SLUGS = new Set(['config', 'layout', 'content']);

const DEFAULTS = {
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
};

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function mergeConfig(userConfig) {
  const config = userConfig ?? {};
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
  };
}

function validateConfig(config) {
  if (!['same-path', 'prefixed-path'].includes(config.i18n.mode)) {
    throw new Error(`Invalid i18n.mode '${config.i18n.mode}'. Use 'same-path' or 'prefixed-path'.`);
  }
  if (!['always', 'never'].includes(config.routing.trailingSlash)) {
    throw new Error(`Invalid routing.trailingSlash '${config.routing.trailingSlash}'. Use 'always' or 'never'.`);
  }
  if (!['lower', 'preserve'].includes(config.routing.slugify)) {
    throw new Error(`Invalid routing.slugify '${config.routing.slugify}'. Use 'lower' or 'preserve'.`);
  }
}

export function getDefaultThemeLayoutDir() {
  return fileURLToPath(new URL('../../aeico-page-theme-default/layout/', import.meta.url));
}

export function loadConfig({ rootDir = process.cwd(), configPath = 'config.json' } = {}) {
  const resolvedPath = path.resolve(rootDir, configPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`config.json not found: ${resolvedPath}`);
  }
  const merged = mergeConfig(readJson(resolvedPath));
  validateConfig(merged);
  return { config: merged, configPath: resolvedPath };
}

function walkMarkdownFiles(baseDir) {
  const files = [];

  function walk(current) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const abs = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(abs);
      } else if (entry.isFile() && abs.toLowerCase().endsWith('.md')) {
        files.push(abs);
      }
    }
  }

  if (fs.existsSync(baseDir)) {
    walk(baseDir);
  }

  return files;
}

function parseFrontmatter(markdown) {
  const match = markdown.match(FRONTMATTER_RE);
  if (!match) {
    return { data: {}, content: markdown };
  }

  const data = {};
  for (const line of match[1].split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const idx = trimmed.indexOf(':');
    if (idx <= 0) {
      continue;
    }
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (value === 'true') {
      data[key] = true;
    } else if (value === 'false') {
      data[key] = false;
    } else if (/^\d+$/.test(value)) {
      data[key] = Number(value);
    } else {
      data[key] = value;
    }
  }

  return {
    data,
    content: markdown.slice(match[0].length)
  };
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function markdownToHtml(markdown) {
  const lines = markdown.replaceAll('\r\n', '\n').split('\n');
  const html = [];
  let paragraphBuffer = [];

  function flushParagraph() {
    if (paragraphBuffer.length === 0) {
      return;
    }
    html.push(`<p>${paragraphBuffer.join(' ')}</p>`);
    paragraphBuffer = [];
  }

  for (const lineRaw of lines) {
    const line = lineRaw.trim();
    if (!line) {
      flushParagraph();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      const level = heading[1].length;
      html.push(`<h${level}>${escapeHtml(heading[2])}</h${level}>`);
      continue;
    }

    if (line === '---') {
      flushParagraph();
      html.push('<hr />');
      continue;
    }

    const safe = escapeHtml(line).replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    paragraphBuffer.push(safe);
  }

  flushParagraph();
  return html.join('\n');
}

function normalizeSegment(segment, mode) {
  let value = segment.trim();
  value = value.replace(/\s+/g, '-');
  value = value.replace(/[^a-zA-Z0-9\-_.]/g, '-');
  value = value.replace(/-+/g, '-');
  return mode === 'lower' ? value.toLowerCase() : value;
}

function relativeMdToRoute(relativePath, routing) {
  const noExt = relativePath.replace(/\.md$/i, '');
  const parts = noExt.split(/[\\/]+/).filter(Boolean).map((part) => normalizeSegment(part, routing.slugify));

  if (routing.cleanIndex && parts.at(-1) === 'index') {
    parts.pop();
  }

  const route = '/' + parts.join('/');
  return route === '/' ? '/' : route;
}

function inferTitle(relativePathNoExt) {
  const name = path.basename(relativePathNoExt);
  if (!name || name === 'index') {
    return 'Untitled';
  }
  return name
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(' ');
}

function validateRoute(route) {
  const segments = route.split('/').filter(Boolean);
  for (const seg of segments) {
    if (RESERVED_SLUGS.has(seg.toLowerCase())) {
      throw new Error(`Route contains reserved segment: ${route}`);
    }
    if (!/^[a-zA-Z0-9\-_.]+$/.test(seg)) {
      throw new Error(`Route contains illegal segment '${seg}' in ${route}`);
    }
  }
}

function routeToOutputFile(route, outDir, trailingSlash) {
  const normalized = route === '/' ? '' : route.replace(/^\//, '');
  if (trailingSlash === 'never') {
    const fileName = normalized ? `${normalized}.html` : 'index.html';
    return path.join(outDir, fileName);
  }
  return path.join(outDir, normalized, 'index.html');
}

function deepGet(obj, keyPath) {
  return keyPath.split('.').reduce((acc, key) => (acc && key in acc ? acc[key] : undefined), obj);
}

function renderTemplate(template, context) {
  return template.replace(/{{\s*([a-zA-Z0-9_.]+)\s*}}/g, (_, keyPath) => {
    const value = deepGet(context, keyPath);
    if (value === undefined || value === null) {
      return '';
    }
    return String(value);
  });
}

function resolveLayoutFile(name, layoutDirs, required, warnings) {
  for (const layoutDir of layoutDirs) {
    const filePath = path.join(layoutDir, `${name}.md`);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
  }

  if (required) {
    throw new Error(`Missing required layout file '${name}.md' in: ${layoutDirs.join(', ')}`);
  }

  warnings.push(`Missing optional partial '${name}.md', fallback to empty content.`);
  return '';
}

function resolveLayoutDirs(rootDir, config) {
  const dirs = [path.resolve(rootDir, config.layout.rootDir)];
  if (config.theme.themeDir) {
    dirs.push(path.resolve(rootDir, config.theme.themeDir));
  }
  dirs.push(getDefaultThemeLayoutDir());
  return dirs;
}

async function applyHookPlugins(plugins, hookName, payload) {
  let nextPayload = payload;
  for (const plugin of plugins) {
    const hook = plugin?.[hookName];
    if (typeof hook !== 'function') {
      continue;
    }
    const result = await hook(nextPayload);
    if (result !== undefined) {
      nextPayload = result;
    }
  }
  return nextPayload;
}

export function scanContent({ rootDir, config }) {
  const contentDir = path.resolve(rootDir, config.content.rootDir);
  return walkMarkdownFiles(contentDir).map((absPath) => ({
    absPath,
    relativePath: path.relative(contentDir, absPath),
    source: fs.readFileSync(absPath, 'utf-8')
  }));
}

export function resolveRoutes({ pages, config }) {
  const routeSet = new Set();
  for (const page of pages) {
    const route = relativeMdToRoute(page.relativePath, config.routing);
    validateRoute(route);
    const key = route.toLowerCase();
    if (routeSet.has(key)) {
      throw new Error(`Route conflict detected: ${route}`);
    }
    routeSet.add(key);
    page.route = route;
  }
  return pages;
}

function transformParsedPage(page, config) {
  const parsed = parseFrontmatter(page.source);
  const frontmatter = parsed.data;

  if (frontmatter.date !== undefined && Number.isNaN(Date.parse(String(frontmatter.date)))) {
    throw new Error(`Invalid date in frontmatter: ${page.absPath}`);
  }

  return {
    ...page,
    frontmatter,
    content: parsed.content,
    title: frontmatter.title || inferTitle(page.relativePath.replace(/\.md$/i, '')),
    description: frontmatter.description || '',
    layoutName: frontmatter.layout || config.layout.defaultLayout || 'home',
    lang: frontmatter.lang || config.i18n.defaultLocale,
    draft: frontmatter.draft === true
  };
}

function renderPageHtml({ page, config, layoutDirs, warnings }) {
  const homeTemplate = resolveLayoutFile(page.layoutName, layoutDirs, true, warnings);
  const headerRaw = resolveLayoutFile(config.layout.partials.header, layoutDirs, false, warnings);
  const footerRaw = resolveLayoutFile(config.layout.partials.footer, layoutDirs, false, warnings);
  const menuRaw = resolveLayoutFile(config.layout.partials.menu, layoutDirs, false, warnings);

  const partialContext = {
    page: {
      title: page.title,
      description: page.description,
      lang: page.lang,
      route: page.route
    },
    site: config.site,
    config,
    theme: config.theme
  };

  const templateContext = {
    page: partialContext.page,
    site: config.site,
    config,
    theme: config.theme,
    content: markdownToHtml(page.content),
    partial: {
      header: markdownToHtml(renderTemplate(headerRaw, partialContext)),
      footer: markdownToHtml(renderTemplate(footerRaw, partialContext)),
      menu: markdownToHtml(renderTemplate(menuRaw, partialContext))
    },
    lang: page.lang,
    themeMode: config.theme.mode,
    pageTitle: page.title,
    pageDescription: page.description,
    header: markdownToHtml(renderTemplate(headerRaw, partialContext)),
    footer: markdownToHtml(renderTemplate(footerRaw, partialContext)),
    menu: markdownToHtml(renderTemplate(menuRaw, partialContext)),
    route: page.route
  };

  return renderTemplate(homeTemplate, templateContext);
}

export function writeOutput({ rootDir, config, renderedPages }) {
  const outDir = path.resolve(rootDir, config.build.outDir);
  fs.rmSync(outDir, { recursive: true, force: true });
  ensureDir(outDir);

  for (const page of renderedPages) {
    const outFile = routeToOutputFile(page.route, outDir, config.routing.trailingSlash);
    ensureDir(path.dirname(outFile));
    fs.writeFileSync(outFile, page.html, 'utf-8');
  }

  return { outDir, pages: renderedPages.length };
}

export async function buildSite(options = {}) {
  const rootDir = path.resolve(options.rootDir ?? process.cwd());
  const plugins = options.plugins ?? [];

  const { config } = loadConfig({ rootDir, configPath: options.configPath ?? 'config.json' });

  let pages = scanContent({ rootDir, config });
  if (pages.length === 0) {
    return { pages: 0, warnings: ['No markdown files found.'], routes: [] };
  }

  pages = await applyHookPlugins(plugins, 'beforeParse', pages);
  pages = pages.map((page) => transformParsedPage(page, config));
  pages = await applyHookPlugins(plugins, 'afterParse', pages);

  pages = resolveRoutes({ pages, config });
  const warnings = [];
  const layoutDirs = resolveLayoutDirs(rootDir, config);

  const renderedPages = [];
  for (const page of pages) {
    if (page.draft && process.env.NODE_ENV === 'production') {
      continue;
    }

    let pageVariants = [page];
    if (config.i18n.enabled && config.i18n.mode === 'prefixed-path') {
      pageVariants = config.i18n.locales.map((locale) => ({
        ...page,
        lang: locale,
        route: page.route === '/' ? `/${locale}` : `/${locale}${page.route}`
      }));
    }

    for (const variant of pageVariants) {
      let variantPayload = await applyHookPlugins(plugins, 'beforeRender', variant);
      const html = renderPageHtml({ page: variantPayload, config, layoutDirs, warnings });
      variantPayload = { ...variantPayload, html };
      variantPayload = await applyHookPlugins(plugins, 'afterRender', variantPayload);
      renderedPages.push(variantPayload);
    }
  }

  let writePayload = { rootDir, config, renderedPages };
  writePayload = await applyHookPlugins(plugins, 'beforeWrite', writePayload);
  const written = writeOutput(writePayload);

  return {
    pages: written.pages,
    outDir: written.outDir,
    warnings,
    routes: renderedPages.map((page) => page.route)
  };
}

export function createGenerator(options = {}) {
  return {
    build: (overrides = {}) => buildSite({ ...options, ...overrides })
  };
}
