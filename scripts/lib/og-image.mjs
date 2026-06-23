/**
 * Build-time Open Graph image generator.
 *
 * Renders a 1200×630 PNG per news post by drawing the post title and category
 * over the existing branded background template, using the project's brand
 * font. Runs at build time (not on the fly) so images are fast to serve.
 *
 * Requires the optional dev dependencies `@resvg/resvg-js` and `wawoff2`; the
 * caller treats an import failure as "skip OG images".
 *
 * @module
 */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import wawoff2 from 'wawoff2';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(SCRIPT_DIR, '..', '..');
const FONT_PATH = join(PROJECT_ROOT, 'src/assets/fonts/antonio-latin.woff2');
const BACKGROUND_PATH = join(PROJECT_ROOT, 'src/assets/social/og-1200x630.png');

const WIDTH = 1200;
const HEIGHT = 630;
const MARGIN = 80;
const TITLE_SIZE = 72;
const TITLE_LINE_HEIGHT = 84;
const MAX_TITLE_LINES = 4;
// Antonio is condensed; this average advance factor keeps lines from
// overflowing the text box.
const AVG_CHAR_WIDTH_FACTOR = 0.46;

/** @type {{ fontBuffer: Buffer, family: string, backgroundDataUri: string } | null} */
let assetsPromise = null;

/**
 * Loads and caches the brand font (decompressed to TTF) and the background
 * image (as a data URI). Subsequent calls reuse the cached assets.
 *
 * @returns {Promise<{ fontBuffer: Buffer, family: string, backgroundDataUri: string }>}
 */
function loadAssets() {
  assetsPromise ??= (async () => {
    const [woff2, background] = await Promise.all([
      readFile(FONT_PATH),
      readFile(BACKGROUND_PATH),
    ]);
    const fontBuffer = Buffer.from(await wawoff2.decompress(woff2));
    const family = readFontFamily(fontBuffer) ?? 'sans-serif';
    const backgroundDataUri = `data:image/png;base64,${background.toString('base64')}`;
    return { fontBuffer, family, backgroundDataUri };
  })();
  return assetsPromise;
}

/**
 * Creates an Open Graph PNG for a post.
 *
 * @param {object} options - Options.
 * @param {string} options.title - The post title.
 * @param {string} [options.category] - The post category (e.g. RELEASE_NOTES).
 * @param {string} [options.siteTitle] - The site title shown at the bottom.
 * @returns {Promise<Buffer>} The PNG buffer.
 */
export async function createOgImage({ title, category, siteTitle }) {
  const { fontBuffer, family, backgroundDataUri } = await loadAssets();
  const svg = buildSvg({
    title: String(title ?? '').trim(),
    category: category ? humanizeCategory(category) : '',
    siteTitle: String(siteTitle ?? '').trim(),
    family,
    backgroundDataUri,
  });

  const resvg = new Resvg(svg, {
    font: {
      fontBuffers: [fontBuffer],
      loadSystemFonts: false,
      defaultFontFamily: family,
    },
    fitTo: { mode: 'width', value: WIDTH },
  });
  return Buffer.from(resvg.render().asPng());
}

/**
 * Builds the SVG document for an OG card.
 *
 * @param {object} options - Options.
 * @param {string} options.title - The (raw) post title.
 * @param {string} options.category - The display category.
 * @param {string} options.siteTitle - The site title.
 * @param {string} options.family - The font family name.
 * @param {string} options.backgroundDataUri - The background image data URI.
 * @returns {string} The SVG string.
 */
function buildSvg({ title, category, siteTitle, family, backgroundDataUri }) {
  const maxTextWidth = WIDTH - MARGIN * 2;
  const lines = wrapText(title, maxTextWidth, TITLE_SIZE);
  const blockHeight = lines.length * TITLE_LINE_HEIGHT;
  const titleStartY = (HEIGHT - blockHeight) / 2 + TITLE_SIZE;

  const titleTspans = lines
    .map(
      (line, index) =>
        `<tspan x="${MARGIN}" y="${titleStartY + index * TITLE_LINE_HEIGHT}">${escapeXml(line)}</tspan>`,
    )
    .join('');

  const categoryEl = category
    ? `<text x="${MARGIN}" y="${MARGIN + 30}" font-family="${escapeXml(family)}" font-size="30" letter-spacing="4" fill="#ffcc66">${escapeXml(category.toUpperCase())}</text>`
    : '';

  const siteEl = siteTitle
    ? `<text x="${MARGIN}" y="${HEIGHT - MARGIN}" font-family="${escapeXml(family)}" font-size="32" fill="#9fb3d1">${escapeXml(siteTitle)}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <image href="${backgroundDataUri}" x="0" y="0" width="${WIDTH}" height="${HEIGHT}" preserveAspectRatio="xMidYMid slice" />
  <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="#070b16" fill-opacity="0.55" />
  ${categoryEl}
  <text font-family="${escapeXml(family)}" font-size="${TITLE_SIZE}" font-weight="700" fill="#ffffff">${titleTspans}</text>
  ${siteEl}
</svg>`;
}

/**
 * Splits a title into lines that fit the given width, truncating with an
 * ellipsis if it exceeds the maximum number of lines.
 *
 * @param {string} title - The title text.
 * @param {number} maxWidth - The maximum line width in pixels.
 * @param {number} fontSize - The font size in pixels.
 * @returns {string[]} The wrapped lines.
 */
function wrapText(title, maxWidth, fontSize) {
  const charsPerLine = Math.max(
    8,
    Math.floor(maxWidth / (fontSize * AVG_CHAR_WIDTH_FACTOR)),
  );
  const words = title.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= charsPerLine) {
      current = candidate;
    } else {
      if (current) {
        lines.push(current);
      }
      current = word;
    }
    if (lines.length === MAX_TITLE_LINES) {
      break;
    }
  }
  if (current && lines.length < MAX_TITLE_LINES) {
    lines.push(current);
  }

  if (lines.length === MAX_TITLE_LINES) {
    const last = lines[MAX_TITLE_LINES - 1];
    if (last.length > charsPerLine - 1) {
      lines[MAX_TITLE_LINES - 1] =
        `${last.slice(0, charsPerLine - 1).trimEnd()}…`;
    } else if (words.join(' ').length > lines.join(' ').length) {
      lines[MAX_TITLE_LINES - 1] = `${last}…`;
    }
  }

  return lines.length > 0 ? lines : [''];
}

/**
 * Turns an enum-style category into a human label (RELEASE_NOTES → Release
 * notes).
 *
 * @param {string} category - The raw category.
 * @returns {string} The display label.
 */
function humanizeCategory(category) {
  const lower = String(category).replace(/_/g, ' ').toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Reads the font family name (name ID 1) from a TTF/OTF buffer.
 *
 * @param {Buffer} buf - The font buffer.
 * @returns {string | null} The family name, or null if not found.
 */
function readFontFamily(buf) {
  const numTables = buf.readUInt16BE(4);
  let nameTableOffset = -1;
  for (let i = 0; i < numTables; i += 1) {
    const record = 12 + i * 16;
    if (buf.toString('latin1', record, record + 4) === 'name') {
      nameTableOffset = buf.readUInt32BE(record + 8);
      break;
    }
  }
  if (nameTableOffset < 0) {
    return null;
  }

  const count = buf.readUInt16BE(nameTableOffset + 2);
  const stringOffset = nameTableOffset + buf.readUInt16BE(nameTableOffset + 4);
  let family = null;
  for (let i = 0; i < count; i += 1) {
    const record = nameTableOffset + 6 + i * 12;
    const platformId = buf.readUInt16BE(record);
    const nameId = buf.readUInt16BE(record + 6);
    const length = buf.readUInt16BE(record + 8);
    const offset = buf.readUInt16BE(record + 10);
    if (nameId !== 1) {
      continue;
    }
    const slice = buf.subarray(
      stringOffset + offset,
      stringOffset + offset + length,
    );
    family =
      platformId === 3
        ? Buffer.from(slice).swap16().toString('utf16le')
        : slice.toString('latin1');
    if (platformId === 3) {
      break;
    }
  }
  return family;
}

/**
 * Escapes XML-significant characters.
 *
 * @param {string} value - The raw value.
 * @returns {string} The escaped value.
 */
function escapeXml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
