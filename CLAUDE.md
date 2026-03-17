# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Start dev server at localhost:4321
- `npm run build` — Type-check with `astro check` then build to `./dist/`
- `npm run preview` — Preview production build locally

## Architecture

This is a personal portfolio/blog built with **Astro 4** (static site generator). Based on the Milky-Way template, deployed to Netlify.

### Content Collections

Two content collections defined in `src/content/config.ts`:

- **projects** (`src/content/projects/*.md`) — Portfolio items with frontmatter: title, description, image, worksImage1, worksImage2, platform, stack, optional website/github
- **posts** (`src/content/posts/*.md`) — Blog posts, sorted by date descending on the listing page

### Routing

- `/` — Homepage (`src/pages/index.astro`)
- `/posts/` — Blog listing, renders `CardPost` for each post
- `/posts/[slug]/` — Individual post, rendered through `MarkdownPostsLayout`
- `/works/` — Projects listing
- `/projects/[slug]/` — Individual project, rendered through `MarkdownWorksLayout`

### Layouts

- `Layout.astro` — Base layout with ViewTransitions, dark/light theme support via localStorage, Google Fonts (Josefin Sans, Pacifico)
- `MarkdownPostsLayout.astro` — Wraps blog post content
- `MarkdownWorksLayout.astro` — Wraps project content

### Styling

Single global stylesheet at `src/styles/global.css`. Dark mode is default; `.light` class on `<html>` activates light theme. Theme toggle handled by `ThemeIcon` component.
