---
title: "feat: Multi-format blog with Ghost CMS"
type: feat
status: active
date: 2026-03-17
origin: docs/brainstorms/2026-03-17-multi-format-blog-brainstorm.md
---

# feat: Multi-format blog with Ghost CMS

## Overview

Transform the blog from a file-based markdown site into a multi-format content stream powered by self-hosted Ghost CMS. Three post types — **articles**, **thoughts**, and **link posts** — are presented in a unified ftrain-style feed at `/posts/`. Ghost provides the authoring UI (including mobile), and Astro remains the static frontend, fetching content from Ghost's Content API at build time. (see brainstorm: docs/brainstorms/2026-03-17-multi-format-blog-brainstorm.md)

## Problem Statement / Motivation

The current blog has too much publishing friction: editing markdown files, git committing, pushing, waiting for deploy. There's no way to post from a phone. All posts are long-form articles with identical presentation, which discourages sharing quick thoughts or links. The goal is a low-friction authoring experience that supports varied content formats, inspired by Daring Fireball and ftrain.

## Proposed Solution

### Architecture

```
┌─────────────┐    webhook     ┌─────────────┐    fetch API    ┌──────────────┐
│  Ghost CMS  │ ──────────────→│   Coolify    │───────────────→│  Astro Build │
│ (authoring) │  post.published│  (rebuild)   │  Content API   │  (static)    │
└─────────────┘                └─────────────┘                 └──────────────┘
     ↑                                                               │
     │ author writes                                    deploys to   │
     │ from any device                                  Coolify      ▼
     │                                                         ┌──────────┐
     └─────────────────────────────────────────────────────────│  Reader  │
                                                               └──────────┘
```

Both Ghost and the Astro site run as separate services on Coolify. Ghost stores content in its database. Astro fetches all published content from Ghost's Content API at build time and generates static HTML. Ghost webhooks trigger Coolify to rebuild when content is published or updated.

### Post Types (via Ghost internal tags)

| Type | Ghost Tag | Dedicated Page | Feed Treatment | Extra Metadata |
|------|-----------|---------------|----------------|----------------|
| Article | `#article` (or untagged) | Yes, `/posts/{slug}/` | Card with image, title → links to page | None |
| Thought | `#thought` | No | Inline text block with date | None |
| Link | `#link` | Yes, `/posts/{slug}/` | Title links externally, commentary inline | `codeinjection_head` JSON: `{"url": "..."}` |

**Default type:** Posts without a type tag are treated as articles. This is the safest fallback since articles are the "full" post type.

**Link post dedicated pages:** Link posts get their own page at `/posts/{slug}/` so commentary has a stable permalink and RSS has a `<guid>` to reference. On the dedicated page, the title links to the external URL, with the author's commentary below.

### Ghost Custom Metadata for Link Posts

Store the external URL in Ghost's `codeinjection_head` field as JSON:

```json
{"url": "https://example.com/interesting-article"}
```

Parsing in Astro:

```typescript
// src/lib/ghost.ts
function extractLinkUrl(post: GhostPost): string | null {
  if (!post.codeinjection_head) return null;
  try {
    const meta = JSON.parse(post.codeinjection_head);
    return meta.url || null;
  } catch {
    return null; // graceful degradation — renders as article
  }
}
```

If a `#link`-tagged post has missing or malformed JSON, it degrades to an article (build continues, logged as a warning).

## Technical Considerations

### Ghost Content API (Astro 4.x pattern)

Astro 4 does not support the Content Loader API (that's Astro 5+). Instead, use direct `fetch` calls or `@tryghost/content-api` in `getStaticPaths()` and page frontmatter.

**API client:** `src/lib/ghost.ts`

```typescript
import GhostContentAPI from '@tryghost/content-api';

export const ghostClient = new GhostContentAPI({
  url: import.meta.env.GHOST_URL,
  key: import.meta.env.GHOST_CONTENT_API_KEY,
  version: 'v5.0',
});

// Fetch all published posts with tags
export async function getAllPosts() {
  const posts = await ghostClient.posts.browse({
    limit: 'all',
    include: 'tags,authors',
    fields: 'id,slug,title,html,published_at,feature_image,feature_image_alt,custom_excerpt,codeinjection_head,excerpt,reading_time',
  });
  return posts.map(classifyPost);
}
```

**Pagination:** Use `limit: 'all'` — acceptable for a personal blog's volume. If this becomes an issue later, implement cursor-based pagination.

**Draft filtering:** Ghost Content API only returns published posts by default. No extra filtering needed.

**Internal tag filtering:** Ghost internal tags use `hash-` slug prefix. Filter with `tag:hash-thought`, `tag:hash-link`.

**Post classification logic:**

```typescript
type PostType = 'article' | 'thought' | 'link';

function classifyPost(post: GhostPost): ClassifiedPost {
  const tags = post.tags?.map(t => t.slug) || [];

  let type: PostType = 'article'; // default
  if (tags.includes('hash-thought')) type = 'thought';
  else if (tags.includes('hash-link')) type = 'link';

  return {
    ...post,
    type,
    externalUrl: type === 'link' ? extractLinkUrl(post) : null,
  };
}
```

### Environment Variables

```bash
# .env (not committed — add to .gitignore)
GHOST_URL=https://cms.yourdomain.com
GHOST_CONTENT_API_KEY=your_content_api_key_here
```

Type declarations in `src/env.d.ts`:

```typescript
interface ImportMetaEnv {
  readonly GHOST_URL: string;
  readonly GHOST_CONTENT_API_KEY: string;
}
```

**Coolify:** Set these as environment variables in Coolify's build configuration for the Astro service.

### Ghost Docker Setup on Coolify

Ghost runs as a separate Coolify service with MySQL:

Key environment variables:
- `url`: public Ghost URL (e.g., `https://cms.yourdomain.com`)
- `database__client`: `mysql`
- `database__connection__*`: MySQL connection details
- Volume: `/var/lib/ghost/content` must persist across deploys

SQLite is an option for simplicity (`NODE_ENV=development` required), but MySQL is recommended for reliability.

### Webhook Rebuild Trigger

Ghost webhook events to configure:
- `post.published` — new content goes live
- `post.published.edited` — published content updated
- `post.unpublished` — content removed
- `post.deleted` — content deleted

Point these at Coolify's webhook deploy endpoint for the Astro service. Coolify supports webhook-triggered deploys — configure the webhook URL in Ghost Admin under Settings > Integrations > Custom Integration > Add Webhook.

### Ghost Koenig Editor HTML Styling

Ghost renders content using its Koenig editor, which produces HTML with specific classes (`kg-card`, `kg-image-card`, `kg-bookmark-card`, etc.). Add CSS rules in `global.css` to style these within the `.blog-post` context. The current 540px max-width may need a breakout pattern for full-width images.

### View Transitions

External link posts need `target="_blank"` and `rel="noopener noreferrer"`, which bypasses Astro's View Transitions click interception. No special handling needed.

### RSS Feed

New dependency: `@astrojs/rss`. Requires `site` in `astro.config.mjs`.

RSS item behavior per post type:
- **Article:** `<link>` → site permalink (`/posts/{slug}/`), full HTML in `<content:encoded>`
- **Thought:** `<link>` → feed page with anchor (`/posts/#thought-{id}`), full text in `<description>`
- **Link:** `<link>` → external URL, `<guid>` → site permalink (`/posts/{slug}/`), commentary in `<description>`

This follows Daring Fireball's convention for link-blog RSS feeds.

## System-Wide Impact

- **Breaking change:** All content moves from file-based markdown to Ghost. The `src/content/posts/` directory and related collection code are removed after migration.
- **Build dependency:** Astro builds now depend on Ghost being reachable. If Ghost is down during a build, the build fails. Previous deployment remains live on Coolify (safe).
- **No impact on:** Projects/works section, homepage (unless we add recent posts later), theme system, base layout structure.

## Acceptance Criteria

### Infrastructure
- [x] Ghost CMS running on Coolify with persistent storage
- [x] Ghost accessible at a subdomain (e.g., `cms.yourdomain.com`)
- [x] Ghost Content API key created and stored as Coolify environment variable
- [ ] Ghost webhook triggers Astro rebuild on publish/edit/delete
- [x] `.env` added to `.gitignore`

### Content Migration
- [ ] All 5 existing markdown posts recreated in Ghost as articles
- [ ] `src/content/posts/` directory removed after migration confirmed
- [ ] Content collection references in `config.ts` cleaned up (posts were never formally defined, but verify)

### Ghost API Integration
- [x] `src/lib/ghost.ts` — Ghost client with `getAllPosts()`, `getPostBySlug()` helpers
- [x] Post classification by internal tags (`#article`, `#thought`, `#link`)
- [x] Link URL extraction from `codeinjection_head` with graceful fallback
- [x] TypeScript types for Ghost post objects and classified posts
- [x] Environment variables for `GHOST_URL` and `GHOST_CONTENT_API_KEY`
- [x] `src/env.d.ts` updated with type declarations

### Feed Page (`/posts/`)
- [x] `src/pages/posts.astro` fetches from Ghost API instead of content collections
- [x] Unified feed renders all three post types sorted by date descending
- [x] Article cards: image (from Ghost `feature_image`), title, date → links to `/posts/{slug}/`
- [x] Thought blocks: inline text, date, no clickthrough
- [x] Link cards: title links to external URL (`target="_blank"`), commentary visible, source domain displayed
- [x] Empty state handled gracefully

### Article Pages
- [x] `src/pages/posts/[slug].astro` — `getStaticPaths()` generates pages for articles and link posts only (not thoughts)
- [x] Ghost HTML rendered via `set:html` directive
- [x] Ghost Koenig editor classes styled in `global.css` (`kg-card`, `kg-image-card`, etc.)
- [x] `MarkdownPostsLayout.astro` adapted for Ghost post data (or replaced with a new layout)

### Link Post Pages
- [x] Dedicated page at `/posts/{slug}/` with title linking to external URL
- [x] Author commentary rendered below
- [x] Clear visual indication this is a link post (external link icon, source domain)

### New Components
- [x] `ArticleCard.astro` — feed card for articles (image, title, date, link to page)
- [x] `ThoughtBlock.astro` — inline feed block for thoughts (text, date)
- [x] `LinkCard.astro` — feed card for link posts (outbound title, commentary, source domain)

### RSS Feed
- [x] `@astrojs/rss` dependency added
- [x] `site` configured in `astro.config.mjs`
- [x] `src/pages/rss.xml.ts` endpoint serving all post types
- [x] RSS auto-discovery `<link>` tag in `Layout.astro` `<head>`
- [x] Articles: site permalink as link, full HTML content
- [x] Thoughts: feed anchor as link, full text
- [x] Link posts: external URL as link, site permalink as guid

### Accessibility
- [x] Post types distinguishable for screen readers (ARIA labels or semantic markup)
- [x] External links indicate they open in a new tab (visually + `aria-label`)
- [x] Proper heading hierarchy in the feed

### SEO
- [x] Article pages have proper `<title>`, `<meta description>`, Open Graph tags
- [x] Link post pages have appropriate canonical URL (their own permalink)
- [x] Feature images from Ghost used as `og:image` where available

## Dependencies & Risks

### Dependencies
- Ghost Docker image (`ghost:5`) availability
- `@tryghost/content-api` npm package (+ `@types/tryghost__content-api` for TypeScript)
- `@astrojs/rss` npm package
- Coolify webhook deploy endpoint configuration
- MySQL (or SQLite) for Ghost database

### Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| Ghost unreachable during build | Build fails, stale site stays live | Coolify keeps previous deployment; monitor build logs |
| Malformed `codeinjection_head` JSON | Link post renders without URL | Graceful degradation to article type; log warning |
| Author forgets type tag | Post renders as article (default) | Document convention; safe fallback |
| Ghost Content API changes in future versions | Build breaks | Pin API version (`v5.0`); test after Ghost updates |
| `codeinjection_head` used for actual code injection | Conflicts with link URL JSON | Document convention: this field is for link URL JSON only on `#link` posts |

## Implementation Phases

### Phase 1: Infrastructure & Ghost Setup
1. Deploy Ghost on Coolify with MySQL and persistent storage
2. Configure Ghost admin, create custom integration for API key
3. Set up Coolify environment variables for Astro build
4. Configure Ghost webhooks for rebuild triggers
5. Test the webhook → rebuild pipeline

### Phase 2: Astro Ghost Integration
1. Install `@tryghost/content-api` and types
2. Create `src/lib/ghost.ts` with client, helpers, and type definitions
3. Add `.env` with Ghost credentials, update `.gitignore`
4. Add `src/env.d.ts` type declarations
5. Modify `src/pages/posts.astro` to fetch from Ghost API
6. Modify `src/pages/posts/[...slug].astro` to use `getStaticPaths()` from Ghost
7. Adapt `MarkdownPostsLayout.astro` for Ghost HTML content via `set:html`

### Phase 3: Multi-Format Feed
1. Create `ArticleCard.astro`, `ThoughtBlock.astro`, `LinkCard.astro` components
2. Update `/posts/` feed to render different components based on post type
3. Create link post page variant with external link title and commentary
4. Style Ghost Koenig editor HTML classes in `global.css`
5. Add external link indicators (icon, `target="_blank"`, `rel="noopener noreferrer"`)

### Phase 4: RSS & Polish
1. Install `@astrojs/rss`, add `site` to `astro.config.mjs`
2. Create `src/pages/rss.xml.ts` with per-type item handling
3. Add RSS auto-discovery link to `Layout.astro`
4. Add Open Graph meta tags to article and link post pages
5. Accessibility pass: ARIA labels, heading hierarchy, screen reader testing

### Phase 5: Migration & Cleanup
1. Recreate all 5 existing posts in Ghost as articles
2. Verify content parity between old markdown and Ghost versions
3. Remove `src/content/posts/` directory
4. Clean up `src/content/config.ts` if needed
5. Remove old `CardPost.astro` component
6. Final end-to-end testing

## Sources & References

### Origin
- **Brainstorm document:** [docs/brainstorms/2026-03-17-multi-format-blog-brainstorm.md](docs/brainstorms/2026-03-17-multi-format-blog-brainstorm.md) — Key decisions: Ghost as headless CMS, post types via internal tags, unified feed replacing /posts/, static generation preserved, RSS included, existing posts migrated.

### Internal References
- Current post listing: `src/pages/posts.astro`
- Current post routing: `src/pages/posts/[...slug].astro`
- Current post layout: `src/layouts/MarkdownPostsLayout.astro`
- Current card component: `src/components/CardPost.astro`
- Content config: `src/content/config.ts`
- Global styles: `src/styles/global.css`
- Base layout: `src/layouts/Layout.astro`

### External References
- [Ghost Content API docs](https://docs.ghost.org/content-api/)
- [Ghost Content API filtering](https://docs.ghost.org/content-api/filtering/)
- [Ghost webhooks](https://docs.ghost.org/webhooks/)
- [Astro + Ghost CMS guide](https://docs.astro.build/en/guides/cms/ghost/)
- [@astrojs/rss docs](https://docs.astro.build/en/guides/rss/)
- [Ghost Docker image](https://hub.docker.com/_/ghost)
- [@tryghost/content-api npm](https://www.npmjs.com/package/@tryghost/content-api)
