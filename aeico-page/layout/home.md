<!doctype html>
<html lang="{{lang}}" data-theme="{{themeMode}}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{{pageTitle}}</title>
    <meta name="description" content="{{pageDescription}}" />
    <style>
      :root {
        color-scheme: light dark;
        --bg: #f6f6ef;
        --fg: #1e1e1e;
        --muted: #6f6f6f;
        --surface: #ffffff;
        --accent: #d97706;
      }
      html[data-theme='dark'] {
        --bg: #131313;
        --fg: #f3f3f3;
        --muted: #b5b5b5;
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
      nav a { margin-right: 0.8rem; color: var(--accent); text-decoration: none; }
      h1, h2, h3 { line-height: 1.25; }
      p { line-height: 1.65; }
      .meta { color: var(--muted); font-size: 0.95rem; }
    </style>
  </head>
  <body>
    <div class="container">
      {{header}}
      {{menu}}
      <main>
        {{content}}
      </main>
      {{footer}}
    </div>
  </body>
</html>
