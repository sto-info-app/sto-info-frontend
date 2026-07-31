import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  AMPERSAND_PATTERN,
  DOUBLE_QUOTE_PATTERN,
  GREATER_THAN_PATTERN,
  HTTP_OR_HTTPS_URL_PATTERN,
  HTTP_PROTOCOL_PATTERN,
  LESS_THAN_PATTERN,
  MARKDOWN_BLOCKQUOTE_LINE_PATTERN,
  MARKDOWN_BLOCK_SPLIT_PATTERN,
  MARKDOWN_BOLD_ASTERISK_PATTERN,
  MARKDOWN_BOLD_UNDERSCORE_PATTERN,
  MARKDOWN_CODE_PLACEHOLDER_BLOCK_PATTERN,
  MARKDOWN_CODE_PLACEHOLDER_PATTERN,
  MARKDOWN_FENCED_CODE_BLOCK_PATTERN,
  MARKDOWN_HEADING_PATTERN,
  MARKDOWN_HORIZONTAL_RULE_PATTERN,
  MARKDOWN_INLINE_CODE_PATTERN,
  MARKDOWN_ITALIC_ASTERISK_PATTERN,
  MARKDOWN_ITALIC_UNDERSCORE_PATTERN,
  MARKDOWN_LEADING_NEWLINE_PATTERN,
  MARKDOWN_LINK_OR_BARE_URL_PATTERN,
  MARKDOWN_ORDERED_LIST_ITEM_PATTERN,
  MARKDOWN_UNORDERED_LIST_ITEM_PATTERN,
  URL_TRAILING_PUNCTUATION_PATTERN,
  YOUTUBE_URL_ID_PATTERN,
} from '../constants/regex-patterns.constants';

/**
 * Renders a safe subset of Markdown to HTML.
 *
 * Input is HTML-escaped first, then a conservative set of Markdown constructs
 * is converted into our own markup, so user/admin-authored content cannot
 * inject arbitrary HTML or scripts. Only `http(s)` and relative links are
 * permitted.
 *
 * Supported: headings, bold, italic, inline code, fenced code blocks, links,
 * unordered/ordered lists, blockquotes, horizontal rules and paragraphs.
 */
@Pipe({
  name: 'markdown',
  standalone: true,
})
export class MarkdownPipe implements PipeTransform {
  private readonly _sanitizer = inject(DomSanitizer);

  /**
   * Transforms Markdown source into sanitized HTML.
   *
   * @param value - The Markdown source.
   * @returns Trusted HTML generated from escaped Markdown input.
   */
  transform(value: string | null | undefined): SafeHtml {
    // render() escapes all source text and only emits allowlisted markup; trust
    // its output so Angular does not remove the fixed, ID-validated iframe.
    return this._sanitizer.bypassSecurityTrustHtml(this.render(value ?? '')); // NOSONAR
  }

  /**
   * Converts Markdown into an HTML string.
   *
   * @param source - The Markdown source.
   * @returns The HTML string.
   */
  private render(source: string): string {
    const codeBlocks: string[] = [];

    // Extract fenced code blocks first so their contents are left untouched.
    const withoutFences = source.replace(
      MARKDOWN_FENCED_CODE_BLOCK_PATTERN,
      (_match, code: string) => {
        const placeholder = `CODE${codeBlocks.length}`;
        codeBlocks.push(
          `<pre class="md-code"><code>${this.escape(code.replace(MARKDOWN_LEADING_NEWLINE_PATTERN, ''))}</code></pre>`,
        );
        return placeholder;
      },
    );

    const escaped = this.escape(withoutFences);
    const blocks = escaped.split(MARKDOWN_BLOCK_SPLIT_PATTERN);
    const rendered = blocks
      .map(block => this.renderBlock(block.trim()))
      .filter(Boolean)
      .join('\n');

    // Restore code blocks.
    return rendered.replace(
      MARKDOWN_CODE_PLACEHOLDER_PATTERN,
      (_match, index: string) => codeBlocks[Number(index)] ?? '',
    );
  }

  /**
   * Renders a single block (paragraph, heading, list, etc.), appending an
   * embedded player for any YouTube links the block contains.
   *
   * @param block - The block text.
   * @returns The rendered HTML for the block.
   */
  private renderBlock(block: string): string {
    if (!block) {
      return '';
    }

    // Leave extracted code blocks untouched; they must not be reinterpreted.
    if (MARKDOWN_CODE_PLACEHOLDER_BLOCK_PATTERN.test(block)) {
      return block;
    }

    return this.renderBlockBody(block) + this.renderVideoEmbeds(block);
  }

  /**
   * Renders the textual HTML for a block, without any trailing video embeds.
   *
   * @param block - The block text.
   * @returns The rendered HTML for the block body.
   */
  private renderBlockBody(block: string): string {
    if (MARKDOWN_HORIZONTAL_RULE_PATTERN.test(block)) {
      return '<hr />';
    }

    const heading = MARKDOWN_HEADING_PATTERN.exec(block);
    if (heading) {
      const level = heading[1].length;
      return `<h${level}>${this.renderInline(heading[2])}</h${level}>`;
    }

    const lines = block.split('\n');

    if (lines.every(line => MARKDOWN_UNORDERED_LIST_ITEM_PATTERN.test(line))) {
      const items = lines
        .map(line => line.replace(MARKDOWN_UNORDERED_LIST_ITEM_PATTERN, ''))
        .map(item => `<li>${this.renderInline(item)}</li>`)
        .join('');
      return `<ul>${items}</ul>`;
    }

    if (lines.every(line => MARKDOWN_ORDERED_LIST_ITEM_PATTERN.test(line))) {
      const items = lines
        .map(line => line.replace(MARKDOWN_ORDERED_LIST_ITEM_PATTERN, ''))
        .map(item => `<li>${this.renderInline(item)}</li>`)
        .join('');
      return `<ol>${items}</ol>`;
    }

    // Note: '>' has already been HTML-escaped to '&gt;' at this point.
    if (lines.every(line => MARKDOWN_BLOCKQUOTE_LINE_PATTERN.test(line))) {
      const quote = lines
        .map(line => line.replace(MARKDOWN_BLOCKQUOTE_LINE_PATTERN, ''))
        .join(' ');
      return `<blockquote>${this.renderInline(quote)}</blockquote>`;
    }

    return `<p>${this.renderInline(lines.join('<br />'))}</p>`;
  }

  /**
   * Renders inline Markdown (bold, italic, code, links). Both `[label](url)`
   * links and bare http(s) URLs are turned into anchors; bare URLs are matched
   * in the same pass so a URL already inside a Markdown link is not linked twice.
   *
   * @param text - The already HTML-escaped inline text.
   * @returns The rendered inline HTML.
   */
  private renderInline(text: string): string {
    return text
      .replace(MARKDOWN_INLINE_CODE_PATTERN, '<code>$1</code>')
      .replace(MARKDOWN_BOLD_ASTERISK_PATTERN, '<strong>$1</strong>')
      .replace(MARKDOWN_BOLD_UNDERSCORE_PATTERN, '<strong>$1</strong>')
      .replace(MARKDOWN_ITALIC_ASTERISK_PATTERN, '<em>$1</em>')
      .replace(MARKDOWN_ITALIC_UNDERSCORE_PATTERN, '<em>$1</em>')
      .replace(
        MARKDOWN_LINK_OR_BARE_URL_PATTERN,
        (match, label: string, url: string, bareUrl: string) => {
          // Bare URL: link it to itself, trimming any trailing sentence
          // punctuation so a following full stop stays outside the link.
          if (bareUrl !== undefined) {
            const trailing =
              URL_TRAILING_PUNCTUATION_PATTERN.exec(bareUrl)?.[0] ?? '';
            const cleanUrl = bareUrl.slice(0, bareUrl.length - trailing.length);
            if (!this.isSafeUrl(cleanUrl)) {
              return match;
            }
            return this.anchor(cleanUrl, cleanUrl) + trailing;
          }

          // Markdown link.
          if (!this.isSafeUrl(url)) {
            return label;
          }
          return this.anchor(url, label);
        },
      );
  }

  /**
   * Builds an anchor for a link. External (http(s)) links open in a new tab and
   * are flagged with a Font Awesome "external link" icon so readers know they
   * leave the site.
   *
   * @param url - The validated, HTML-escaped URL.
   * @param label - The HTML for the link text.
   * @returns The anchor HTML.
   */
  private anchor(url: string, label: string): string {
    if (!HTTP_PROTOCOL_PATTERN.test(url)) {
      return `<a href="${url}">${label}</a>`;
    }
    const icon =
      '<i class="fas fa-arrow-up-right-from-square md-external-icon" aria-hidden="true"></i>';
    return `<a href="${url}" rel="noopener noreferrer" target="_blank">${label}${icon}</a>`;
  }

  /**
   * Builds embedded YouTube players for every unique video linked within a
   * block. Because only an 11-character video id (validated by the regex) is
   * interpolated into a fixed, privacy-friendly embed URL, no untrusted markup
   * can reach the output.
   *
   * @param block - The block text to scan for YouTube links.
   * @returns Concatenated embed HTML, or an empty string when none are found.
   */
  private renderVideoEmbeds(block: string): string {
    const ids = new Set<string>();
    for (const match of block.matchAll(YOUTUBE_URL_ID_PATTERN)) {
      ids.add(match[1]);
    }

    return [...ids]
      .map(
        id =>
          `<div class="md-video"><iframe src="https://www.youtube-nocookie.com/embed/${id}" title="Embedded YouTube video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>`,
      )
      .join('');
  }

  /**
   * Determines whether a link URL is safe to render.
   *
   * @param url - The candidate URL.
   * @returns `true` for http(s) and relative URLs.
   */
  private isSafeUrl(url: string): boolean {
    return (
      HTTP_OR_HTTPS_URL_PATTERN.test(url) ||
      url.startsWith('/') ||
      url.startsWith('#')
    );
  }

  /**
   * Escapes HTML special characters.
   *
   * @param value - The raw value.
   * @returns The escaped value.
   */
  private escape(value: string): string {
    return value
      .replace(AMPERSAND_PATTERN, '&amp;')
      .replace(LESS_THAN_PATTERN, '&lt;')
      .replace(GREATER_THAN_PATTERN, '&gt;')
      .replace(DOUBLE_QUOTE_PATTERN, '&quot;');
  }
}
