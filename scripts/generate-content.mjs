/**
 * Build-time content generator.
 *
 * Fetches published news posts from the API and writes the public discovery
 * artifacts into `generated/` (copied to the site root at build):
 *   - sitemap.xml   (same-host sitemap, includes every published post)
 *   - feed.xml      (RSS 2.0)
 *   - feed.json     (JSON Feed 1.1)
 *   - og/news/<slug>.png  (per-post Open Graph images)
 *
 * Generating at build time keeps these fast to serve and same-host. Run a
 * deploy/rebuild when you publish news so the artifacts stay fresh.
 *
 * The script is resilient: if the API is unreachable it still writes a sitemap
 * of the static routes and empty feeds, and exits successfully so the build is
 * not blocked.
 *
 * @module
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildJsonFeed, buildRssFeed, buildSitemap } from './lib/feeds.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(SCRIPT_DIR, '..');
const OUTPUT_DIR = join(PROJECT_ROOT, 'generated');

const PAGE_SIZE = 50;
const MAX_PAGES = 500;

const API_URL = (process.env.API_URL || 'http://localhost:3000').replace(
  /\/+$/,
  '',
);
const SITE_URL = (
  process.env.SITE_URL ||
  process.env.APP_FRONTEND_URL ||
  'https://startrekonline.info'
).replace(/\/+$/, '');
const APP_TITLE = process.env.APP_TITLE || 'Star Trek Online Info Portal';
const FEED_TITLE = `${APP_TITLE} — News`;
const FEED_DESCRIPTION =
  'Release notes, announcements and updates from the Star Trek Online Info Portal.';
const FEED_AUTHOR = `support@startrekonline.info (${APP_TITLE})`;

/**
 * Fetches every published news post by paging through the public news API.
 *
 * @param {string} [apiUrl=API_URL] - The API base URL.
 * @returns {Promise<object[]>} The published posts.
 */
export async function fetchAllPublishedPosts(apiUrl = API_URL) {
  const posts = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const url = `${apiUrl}/news?page=${page}&pageSize=${PAGE_SIZE}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`News API responded ${response.status} for ${url}`);
    }
    const data = await response.json();
    const items = Array.isArray(data.items) ? data.items : [];
    posts.push(...items);

    const total = Number(data.total ?? posts.length);
    if (items.length === 0 || posts.length >= total) {
      break;
    }
  }
  return posts;
}

/**
 * Writes a file, creating parent directories as needed.
 *
 * @param {string} relativePath - Path relative to the output directory.
 * @param {string|Buffer} contents - The file contents.
 * @returns {Promise<void>}
 */
async function writeOutput(relativePath, contents) {
  const fullPath = join(OUTPUT_DIR, relativePath);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, contents);
}

/**
 * Generates Open Graph images for the posts, if the optional generator and its
 * dependencies are available. Failures are non-fatal.
 *
 * @param {object[]} posts - The published posts.
 * @returns {Promise<number>} The number of images written.
 */
async function generateOgImages(posts) {
  let createOgImage;
  try {
    ({ createOgImage } = await import('./lib/og-image.mjs'));
  } catch (error) {
    console.warn(
      `[generate-content] Skipping OG images (generator unavailable): ${error.message}`,
    );
    return 0;
  }

  let written = 0;
  for (const post of posts) {
    try {
      const png = await createOgImage({
        title: post.title,
        category: post.category,
        siteTitle: APP_TITLE,
      });
      await writeOutput(join('og', 'news', `${post.slug}.png`), png);
      written += 1;
    } catch (error) {
      console.warn(
        `[generate-content] OG image failed for "${post.slug}": ${error.message}`,
      );
    }
  }
  return written;
}

/**
 * Runs the generator.
 *
 * @returns {Promise<void>}
 */
async function main() {
  let posts = [];
  try {
    posts = await fetchAllPublishedPosts();
    console.log(
      `[generate-content] Fetched ${posts.length} published post(s) from ${API_URL}`,
    );
  } catch (error) {
    console.warn(
      `[generate-content] Could not fetch news (${error.message}). Writing static sitemap and empty feeds.`,
    );
  }

  const feedOptions = {
    siteUrl: SITE_URL,
    title: FEED_TITLE,
    description: FEED_DESCRIPTION,
    author: FEED_AUTHOR,
    posts,
  };

  await writeOutput('sitemap.xml', buildSitemap({ siteUrl: SITE_URL, posts }));
  await writeOutput('feed.xml', buildRssFeed(feedOptions));
  await writeOutput('feed.json', buildJsonFeed(feedOptions));
  console.log(
    `[generate-content] Wrote sitemap.xml, feed.xml and feed.json to generated/`,
  );

  const ogCount = await generateOgImages(posts);
  if (ogCount > 0) {
    console.log(`[generate-content] Wrote ${ogCount} OG image(s)`);
  }
}

// Only run when invoked directly (e.g. `node scripts/generate-content.mjs`),
// so the module can also be imported for testing without side effects.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    // Never block the build on content generation.
    console.warn(`[generate-content] Unexpected error: ${error.message}`);
  });
}
