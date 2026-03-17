import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getAllPosts } from "../lib/ghost";

export async function GET(context: APIContext) {
  const posts = await getAllPosts();

  return rss({
    title: "willo.dev",
    description: "Articles, thoughts, and links from Will Osbourne.",
    site: context.site!.toString(),
    items: posts.map((post) => {
      if (post.type === "link" && post.externalUrl) {
        return {
          title: post.title,
          description: post.html,
          // Link posts point to the external URL (Daring Fireball convention)
          link: post.externalUrl,
          // guid is the site's own permalink
          customData: `<guid isPermaLink="false">${context.site}posts/${post.slug}/</guid>`,
          pubDate: new Date(post.published_at),
        };
      }

      if (post.type === "thought") {
        return {
          title: post.title,
          description: post.html,
          link: `/feed/#thought-${post.id}`,
          pubDate: new Date(post.published_at),
        };
      }

      // Article
      return {
        title: post.title,
        description: post.custom_excerpt || post.excerpt,
        content: post.html,
        link: `/feed/${post.slug}/`,
        pubDate: new Date(post.published_at),
      };
    }),
    customData: `<language>en-gb</language>`,
  });
}
