# Multi-Format Blog with Ghost CMS

**Date:** 2026-03-17
**Status:** Brainstorm

## What We're Building

A personal blog that supports three distinct post types — **articles**, **quick thoughts**, and **link posts** — presented together in a unified feed (ftrain-style stream). The site stays statically generated with Astro but moves content authoring into a self-hosted Ghost instance, enabling posting from any device with a web browser.

### Post Types

- **Article:** Long-form posts with their own dedicated page (`/posts/slug/`). Title, author, date, body, optional hero image. These are the current blog posts.
- **Thought:** Short, tweet-like observations. No dedicated page — displayed inline on the feed only. Just text and a date. Minimal friction to create.
- **Link post:** A post centered around an external URL, with a title, the link, and brief commentary. Displayed inline on the feed. Title links outward (Daring Fireball style).

### Unified Feed

The `/posts/` page becomes a single stream mixing all three types, sorted by date descending. Each type has distinct visual treatment:

- Articles show as cards (similar to current design) linking to their dedicated page
- Thoughts appear as compact inline text blocks
- Link posts show the title as an outbound link with commentary beneath

### Authoring via Ghost (Headless)

Ghost runs self-hosted on Coolify alongside the Astro site. Content is authored in Ghost's web editor (good mobile experience). Post types are modeled via Ghost tags (`#article`, `#thought`, `#link`). Ghost's Content API is consumed by Astro at build time.

Publishing flow: Author in Ghost → Ghost triggers Coolify rebuild webhook → Astro rebuilds, fetching from Ghost API → Static site deploys.

## Why This Approach

- **Ghost** provides a polished, mobile-friendly web editor out of the box — solving the "too many steps" and "no mobile option" pain points
- **Self-hosted on Coolify** keeps full control of data, no SaaS dependency
- **Headless Ghost + static Astro** preserves the benefits of static (caching, performance, simplicity) while decoupling authoring from the codebase
- **Tags for post types** is a proven pattern — avoids needing custom Ghost modifications
- **Ghost's API** opens the door to future automation (iOS Shortcuts, CLI posting, bookmarklets)
- **ftrain-style unified feed** matches the desired content philosophy — a river of mixed-format thoughts

## Key Decisions

1. **Ghost over Keystatic/Payload** — Best balance of editor UX, mobile support, API capabilities, and self-hosting simplicity. Content moves out of Git into Ghost's database.
2. **Post types via Ghost tags** — Using internal tags (`#thought`, `#link`, `#article`) rather than custom fields. Simple, no Ghost customization needed.
3. **Unified feed replaces /posts/** — All post types on one page. Articles still get dedicated pages at `/posts/slug/`.
4. **Thoughts and links are feed-only** — No dedicated pages for short-form content. Keeps the site clean.
5. **Static generation preserved** — Ghost acts as a headless CMS; Astro fetches at build time. Rebuild triggered by webhook on publish.
6. **RSS feed included** — Added as part of this work. Unified feed of all post types.
7. **Migrate existing posts to Ghost** — All 5 current markdown posts move into Ghost. Single content source going forward.

## Resolved Questions

1. **Link post external URL storage:** Use Ghost's code injection or custom fields to store the external URL as structured metadata. Cleanest separation of content and metadata, avoids parsing hacks.
2. **Existing post migration:** Migrate all 5 existing markdown posts into Ghost. Single content source, cleaner long-term.
3. **RSS feed:** Yes, include RSS as part of this work. Natural fit for a multi-format blog, aligns with IndieWeb ethos.

## Open Questions

1. **Rebuild trigger mechanism:** How does Ghost on Coolify trigger an Astro rebuild? Coolify likely supports webhook-triggered deploys — need to confirm the specific mechanism during planning/implementation.
2. **Ghost custom field implementation:** Ghost's native custom field support is limited. Need to evaluate: (a) Ghost's `codeinjection_head` field for storing JSON metadata, (b) a Ghost custom integration, or (c) Ghost's newer "custom excerpts" or "feature image caption" fields repurposed. Best explored during implementation.
