<!doctype html>
<html lang="{{ page.lang }}" data-theme="{{ theme.mode }}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{{ page.title }} | {{ site.title }}</title>
    <meta name="description" content="{{ page.description }}" />
    <style>
      :root {
        color-scheme: light dark;
        --bg: #f7f4eb;
        --fg: #1d1d1d;
        --muted: #6d6d6d;
        --surface: #ffffff;
        --accent: #b45309;
      }
      html[data-theme='dark'] {
        --bg: #151515;
        --fg: #f2f2f2;
        --muted: #b1b1b1;
        --surface: #1f1f1f;
        --accent: #f59e0b;
      }
      body {
        margin: 0;
        font-family: Georgia, 'Times New Roman', serif;
        background: radial-gradient(circle at 20% 10%, #fff2d6, transparent 35%), var(--bg);
        color: var(--fg);
      }
      .container {
        max-width: 860px;
        margin: 0 auto;
        padding: 1rem;
      }
      header, footer, nav, main {
        background: var(--surface);
        border-radius: 12px;
        padding: 1rem 1.2rem;
        margin: 0.8rem 0;
      }
      nav a {
        margin-right: 0.8rem;
        color: var(--accent);
        text-decoration: none;
      }
      p {
        line-height: 1.65;
      }
    </style>
  </head>
  <body>
    <div class="container">
      {{ partial.header }}
      {{ partial.menu }}
      <main>
        {{ content }}
      </main>
      {{ partial.footer }}
    </div>
  </body>
</html>
