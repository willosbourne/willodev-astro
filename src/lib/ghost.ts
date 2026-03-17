import GhostContentAPI from "@tryghost/content-api";

const ghostClient = new GhostContentAPI({
  url: import.meta.env.GHOST_URL,
  key: import.meta.env.GHOST_CONTENT_API_KEY,
  version: "v5.0",
});

export type PostType = "article" | "thought" | "link";

export interface GhostTag {
  id: string;
  name: string;
  slug: string;
}

export interface GhostAuthor {
  id: string;
  name: string;
  slug: string;
  profile_image: string | null;
}

export interface GhostPost {
  id: string;
  slug: string;
  title: string;
  html: string;
  published_at: string;
  feature_image: string | null;
  feature_image_alt: string | null;
  custom_excerpt: string | null;
  excerpt: string;
  codeinjection_head: string | null;
  reading_time: number;
  tags: GhostTag[];
  authors: GhostAuthor[];
  primary_author: GhostAuthor;
}

export interface ClassifiedPost extends GhostPost {
  type: PostType;
  externalUrl: string | null;
}

function extractLinkUrl(post: GhostPost): string | null {
  if (!post.codeinjection_head) return null;
  try {
    const meta = JSON.parse(post.codeinjection_head);
    return meta.url || null;
  } catch {
    console.warn(
      `[ghost] Malformed codeinjection_head JSON on post "${post.slug}", degrading to article`
    );
    return null;
  }
}

function classifyPost(post: GhostPost): ClassifiedPost {
  const tagSlugs = post.tags?.map((t) => t.slug) || [];

  let type: PostType = "article";
  if (tagSlugs.includes("hash-thought")) type = "thought";
  else if (tagSlugs.includes("hash-link")) type = "link";

  const externalUrl = type === "link" ? extractLinkUrl(post) : null;

  // If it's tagged as link but has no URL, degrade to article
  if (type === "link" && !externalUrl) {
    type = "article";
  }

  return { ...post, type, externalUrl };
}

export async function getAllPosts(): Promise<ClassifiedPost[]> {
  const posts = (await ghostClient.posts.browse({
    limit: "all",
    include: ["tags", "authors"] as any,
  })) as unknown as GhostPost[];

  return posts.map(classifyPost);
}

export async function getPostBySlug(
  slug: string
): Promise<ClassifiedPost | null> {
  try {
    const post = (await ghostClient.posts.read(
      { slug },
      { include: ["tags", "authors"] as any }
    )) as unknown as GhostPost;
    return classifyPost(post);
  } catch {
    return null;
  }
}

export function getSourceDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
