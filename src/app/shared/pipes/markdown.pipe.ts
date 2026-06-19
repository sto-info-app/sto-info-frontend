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
  MARKDOWN_LINK_PATTERN,
  MARKDOWN_ORDERED_LIST_ITEM_PATTERN,
  MARKDOWN_UNORDERED_LIST_ITEM_PATTERN,
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
  private readonly sanitizer = inject(DomSanitizer);

  /**
   * Transforms Markdown source into sanitized HTML.
   *
   * @param value - The Markdown source.
   * @returns The rendered, trusted HTML (safe because the source is escaped).
   */
  transform(value: string | null | undefined): SafeHtml {
    const html = this.render(value ?? '');
    return this.sanitizer.bypassSecurityTrustHtml(html);
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
   * Renders a single block (paragraph, heading, list, etc.).
   *
   * @param block - The block text.
   * @returns The rendered HTML for the block.
   */
  private renderBlock(block: string): string {
    if (!block) {
      return '';
    }

    if (MARKDOWN_CODE_PLACEHOLDER_BLOCK_PATTERN.test(block)) {
      return block;
    }

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
   * Renders inline Markdown (bold, italic, code, links).
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
      .replace(MARKDOWN_LINK_PATTERN, (_match, label: string, url: string) => {
        if (!this.isSafeUrl(url)) {
          return label;
        }
        const external = HTTP_PROTOCOL_PATTERN.test(url);
        const rel = external
          ? ' rel="noopener noreferrer" target="_blank"'
          : '';
        return `<a href="${url}"${rel}>${label}</a>`;
      });
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
