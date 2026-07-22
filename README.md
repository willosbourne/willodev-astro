# willo.dev

Personal site and blog for Will Osbourne — [willo.dev](https://willo.dev).

## Architecture

Static site built with [Astro 4](https://astro.build) and deployed to Netlify. Content lives in two places:

- **Local content collections** (`src/content/`) — Markdown projects and posts, defined in `src/content/config.ts`.
- **Ghost** — long-form blog posts are pulled from a headless Ghost instance at build time via the Content API (`src/lib/ghost.ts`).

The unified feed (`/feed/`) blends articles, thoughts, and links, with individual entries rendered at `/feed/[slug]/`. An RSS feed is generated at `/rss.xml`. Privacy-friendly analytics are provided by [Umami](https://umami.is).

Styling is a single global stylesheet (`src/styles/global.css`). Dark mode is the default; a `.light` class on `<html>` (toggled by the theme switcher and persisted in `localStorage`) activates the light theme.

## Development

| Command           | Action                                       |
| :---------------- | :------------------------------------------- |
| `npm install`     | Install dependencies                         |
| `npm run dev`     | Start the dev server at `localhost:4321`     |
| `npm run build`   | Type-check with `astro check`, then build to `./dist/` |
| `npm run preview` | Preview the production build locally         |

See `.env.example` for the required environment variables (Ghost API and Umami config).
