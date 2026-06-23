/**
 * Pure builders for the public sitemap, RSS feed and JSON feed.
 *
 * These functions take already-fetched data and return strings, so they are
 * easy to unit test and have no side effects or external dependencies.
 *
 * @module
 */

/**
 * Public, crawlable static frontend paths included in the sitemap.
 *
 * @type {{ path: string, changefreq: string, priority: string }[]}
 */
export const STATIC_SITEMAP_PATHS = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/news', changefreq: 'daily', priority: '0.8' },
  { path: '/about', changefreq: 'monthly', priority: '0.6' },
  { path: '/about/developers', changefreq: 'monthly', priority: '0.4' },
  { path: '/about/volunteers', changefreq: 'monthly', priority: '0.4' },
  { path: '/about/supporters', changefreq: 'monthly', priority: '0.4' },
  { path: '/contact', changefreq: 'yearly', priority: '0.5' },
  { path: '/terms-of-use', changefreq: 'yearly', priority: '0.3' },
  { path: '/privacy-policy', changefreq: 'yearly', priority: '0.3' },
  { path: '/credits', changefreq: 'yearly', priority: '0.3' },
];

/**
 * Escapes XML-significant characters.
 *
 * @param {string} value - The raw value.
 * @returns {string} The escaped value.
 */
export function escapeXml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

/**
 * Joins a base URL and a path without duplicating slashes.
 *
 * @param {string} baseUrl - The site base URL (may have a trailing slash).
 * @param {string} path - The path (should start with a slash).
 * @returns {string} The absolute URL.
 */
export function absoluteUrl(baseUrl, path) {
  return `${baseUrl.replace(/\/+$/, '')}${path}`;
}

/**
 * Converts a Markdown/plain string into a trimmed single-line plain-text
 * excerpt, suitable for feed summaries.
 *
 * @param {string} value - The source text.
 * @param {number} [maxLength=280] - Maximum length before truncation.
 * @returns {string} The excerpt.
 */
export function toPlainTextExcerpt(value, maxLength = 280) {
  const text = String(value ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`~-]+/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

/**
 * Resolves the best summary for a post.
 *
 * @param {{ summary?: string|null, body?: string }} post - The post.
 * @returns {string} The summary text.
 */
function postSummary(post) {
  if (post.summary && post.summary.trim()) {
    return post.summary.trim();
  }
  return toPlainTextExcerpt(post.body);
}

/**
 * Builds the XML sitemap.
 *
 * @param {object} options - Options.
 * @param {string} options.siteUrl - The canonical site URL.
 * @param {{ slug: string, updatedAt?: string|null, publishedAt?: string|null }[]} options.posts - Published posts.
 * @param {{ path: string, changefreq: string, priority: string }[]} [options.staticPaths] - Static paths.
 * @returns {string} The sitemap XML.
 */
export function buildSitemap({
  siteUrl,
  posts,
  staticPaths = STATIC_SITEMAP_PATHS,
}) {
  const entries = [
    ...staticPaths.map(
      ({ path, changefreq, priority }) =>
        `  <url>\n    <loc>${escapeXml(absoluteUrl(siteUrl, path))}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`,
    ),
    ...posts.map(post => {
      const loc = escapeXml(absoluteUrl(siteUrl, `/news/${post.slug}`));
      const lastmodSource = post.updatedAt ?? post.publishedAt;
      const lastmod = lastmodSource
        ? `\n    <lastmod>${new Date(lastmodSource).toISOString()}</lastmod>`
        : '';
      return `  <url>\n    <loc>${loc}</loc>${lastmod}\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>`;
    }),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;
}

/**
 * Builds an RSS 2.0 feed of news posts.
 *
 * @param {object} options - Options.
 * @param {string} options.siteUrl - The canonical site URL.
 * @param {string} options.title - The feed title.
 * @param {string} options.description - The feed description.
 * @param {string} options.author - The feed author/managing editor.
 * @param {string} [options.feedPath='/feed.xml'] - The feed's own path.
 * @param {{ slug: string, title: string, summary?: string|null, body?: string, category?: string, publishedAt?: string|null, updatedAt?: string|null }[]} options.posts - Posts.
 * @returns {string} The RSS XML.
 */
export function buildRssFeed({
  siteUrl,
  title,
  description,
  author,
  feedPath = '/feed.xml',
  posts,
}) {
  const self = escapeXml(absoluteUrl(siteUrl, feedPath));
  const lastBuildDate = new Date().toUTCString();

  const items = posts
    .map(post => {
      const link = escapeXml(absoluteUrl(siteUrl, `/news/${post.slug}`));
      const pubDate = post.publishedAt
        ? new Date(post.publishedAt).toUTCString()
        : lastBuildDate;
      const category = post.category
        ? `\n      <category>${escapeXml(post.category)}</category>`
        : '';
      return [
        '    <item>',
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${link}</link>`,
        `      <guid isPermaLink="true">${link}</guid>`,
        `      <pubDate>${pubDate}</pubDate>${category}`,
        `      <description>${escapeXml(postSummary(post))}</description>`,
        '    </item>',
      ].join('\n');
    })
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escapeXml(title)}</title>`,
    `    <link>${escapeXml(siteUrl.replace(/\/+$/, ''))}/news</link>`,
    `    <description>${escapeXml(description)}</description>`,
    '    <language>en</language>',
    `    <managingEditor>${escapeXml(author)}</managingEditor>`,
    `    <lastBuildDate>${lastBuildDate}</lastBuildDate>`,
    `    <atom:link href="${self}" rel="self" type="application/rss+xml" />`,
    items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
}

/**
 * Builds a JSON Feed 1.1 document of news posts.
 *
 * @param {object} options - Options.
 * @param {string} options.siteUrl - The canonical site URL.
 * @param {string} options.title - The feed title.
 * @param {string} options.description - The feed description.
 * @param {string} options.author - The feed author name.
 * @param {string} [options.feedPath='/feed.json'] - The feed's own path.
 * @param {{ slug: string, title: string, summary?: string|null, body?: string, category?: string, publishedAt?: string|null, updatedAt?: string|null }[]} options.posts - Posts.
 * @returns {string} The JSON feed string.
 */
export function buildJsonFeed({
  siteUrl,
  title,
  description,
  author,
  feedPath = '/feed.json',
  posts,
}) {
  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title,
    home_page_url: `${siteUrl.replace(/\/+$/, '')}/news`,
    feed_url: absoluteUrl(siteUrl, feedPath),
    description,
    authors: [{ name: author }],
    language: 'en',
    items: posts.map(post => {
      const url = absoluteUrl(siteUrl, `/news/${post.slug}`);
      const item = {
        id: url,
        url,
        title: post.title,
        summary: postSummary(post),
        content_text: String(post.body ?? postSummary(post)),
        date_published: post.publishedAt
          ? new Date(post.publishedAt).toISOString()
          : undefined,
        date_modified: post.updatedAt
          ? new Date(post.updatedAt).toISOString()
          : undefined,
        tags: post.category ? [post.category] : undefined,
      };
      // Drop undefined keys for a clean document.
      return Object.fromEntries(
        Object.entries(item).filter(([, v]) => v !== undefined),
      );
    }),
  };

  return `${JSON.stringify(feed, null, 2)}\n`;
}
