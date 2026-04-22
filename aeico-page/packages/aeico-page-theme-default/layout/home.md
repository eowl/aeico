<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{{ page.title }} | {{ site.title }}</title>
    <meta name="description" content="{{ page.description }}" />
    <script type="module" src="/assets/aeico.js"></script>
    <style>
      *, *::before, *::after { box-sizing: border-box; }
      :root {
        --bg: #f7f4eb;
        --fg: #2c2c2c;
        --muted: #6b6b6b;
        --surface: #ffffff;
        --border: #e0dcd0;
        --accent: #b45309;
        --sidebar-w: 220px;
        --navbar-h: 52px;
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --bg: #151515;
          --fg: #f0f0f0;
          --muted: #aaaaaa;
          --surface: #1e1e1e;
          --border: #333;
          --accent: #f59e0b;
        }
      }
      body { margin: 0; font-family: system-ui, sans-serif; background: var(--bg); color: var(--fg); }
      a { color: var(--accent); text-decoration: none; }
      a:hover { text-decoration: underline; }

      /* Navbar */
      .ap-navbar {
        position: sticky; top: 0; z-index: 100;
        display: flex; align-items: center; gap: 0.5rem;
        height: var(--navbar-h);
        background: var(--surface);
        border-bottom: 1px solid var(--border);
        padding: 0 1.5rem;
      }
      .ap-navbar .site-title { font-weight: 700; margin-right: 1rem; font-size: 1.05rem; }

      /* Layout */
      .ap-layout { display: flex; min-height: calc(100vh - var(--navbar-h)); }

      /* Sidebar */
      .ap-sidebar {
        width: var(--sidebar-w); flex-shrink: 0;
        background: var(--surface);
        border-right: 1px solid var(--border);
        padding: 1.2rem 0.8rem;
        position: sticky; top: var(--navbar-h);
        height: calc(100vh - var(--navbar-h));
        overflow-y: auto;
      }
      .ap-sidebar ul { list-style: none; margin: 0; padding: 0; }
      .ap-sidebar li { margin: 0.2rem 0; }

      /* Content */
      .ap-content {
        flex: 1; min-width: 0;
        padding: 2rem 2.5rem;
        max-width: 800px;
      }
      .ap-content h1 { margin-top: 0; }
      .ap-content p { line-height: 1.7; }
      .ap-content code {
        background: var(--border); border-radius: 3px;
        padding: 0.1em 0.4em; font-size: 0.9em;
      }
      .ap-content pre { background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 1rem; overflow-x: auto; }
      .ap-content pre code { background: none; padding: 0; }
    </style>
  </head>
  <body>
    {{ navbar }}
    <div class="ap-layout">
      {{ sidebar }}
      <main class="ap-content">
        {{ content }}
      </main>
    </div>
  </body>
</html>
