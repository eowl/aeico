# aeico-page

aeico-page is a markdown-first static site generator framework built on the aeico ecosystem.

V1 is designed as library + CLI, not only a single site implementation.

## Packages

- packages/aeico-page-core: core library APIs
- packages/aeico-page-cli: command line tool
- packages/aeico-page-theme-default: default layout assets
- examples/basic-site: consumer example site

## Jekyll-style authoring model

- Write markdown files in content/
- Define layout parts in layout/
- Control global behavior in config.json

Route mapping examples:

- content/chapter_1/hello.md -> /chapter_1/hello/
- content/chapter_1/index.md -> /chapter_1/

## CLI commands

- npm run build
- npm run dev
- npm run preview
- npm run init
- npm run example:build
- npm run example:dev
- npm run example:preview

Run from aeico-page directory:

```bash
cd aeico-page
npm run example:preview
```

Or from repository root:

```bash
npm --prefix ./aeico-page run example:preview
```

## Programmatic API (core)

```js
import { buildSite, createGenerator } from './packages/aeico-page-core/src/index.mjs';

await buildSite({ rootDir: process.cwd() });

const generator = createGenerator({ rootDir: process.cwd() });
await generator.build();
```

## Config highlights

- i18n mode: same-path or prefixed-path
- layout resolution: frontmatter.layout -> config.layout.defaultLayout -> home
- fallback theme: if site layout files are missing, default theme files are used
