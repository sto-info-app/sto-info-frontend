import { SecurityContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { MarkdownPipe } from './markdown.pipe';

describe('MarkdownPipe', () => {
  let pipe: MarkdownPipe;
  let sanitizer: DomSanitizer;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MarkdownPipe],
    });
    pipe = TestBed.inject(MarkdownPipe);
    sanitizer = TestBed.inject(DomSanitizer);
  });

  const render = (input: string): string =>
    sanitizer.sanitize(SecurityContext.HTML, pipe.transform(input)) ?? '';

  // The pipe's own output, before the sanitiser has a view on it: these
  // constructs are about the markup this class emits.
  const transform = (input: string): string => pipe.transform(input) as string;

  it('renders headings', () => {
    expect(render('# Hello')).toContain('<h1>Hello</h1>');
  });

  it('renders bold and italic', () => {
    expect(render('**bold** and *italic*')).toContain('<strong>bold</strong>');
    expect(render('*italic*')).toContain('<em>italic</em>');
  });

  it('renders unordered lists', () => {
    const html = render('- one\n- two');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>one</li>');
  });

  it('renders ordered lists', () => {
    const html = render('1. one\n2. two');
    expect(html).toContain('<ol>');
  });

  it('renders blockquotes', () => {
    expect(render('> quoted')).toContain('<blockquote>quoted</blockquote>');
  });

  it('renders safe links and rejects javascript urls', () => {
    expect(render('[ok](https://example.com)')).toContain(
      '<a href="https://example.com"',
    );
    const unsafe = render('[bad](javascript:alert(1))');
    expect(unsafe).not.toContain('href');
    expect(unsafe).toContain('bad');
  });

  it('flags external links with an icon and opens them in a new tab', () => {
    const html = render('[ok](https://example.com)');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('fa-arrow-up-right-from-square');
  });

  it('does not add an external icon to relative links', () => {
    const html = render('[home](/news)');
    expect(html).toContain('<a href="/news">home</a>');
    expect(html).not.toContain('fa-arrow-up-right-from-square');
  });

  it('embeds a YouTube player for youtu.be and watch links', () => {
    const shortHtml = render('Watch: [video](https://youtu.be/pXSzMqregd8)');
    expect(shortHtml).toContain(
      '<iframe src="https://www.youtube-nocookie.com/embed/pXSzMqregd8"',
    );

    const watchHtml = render(
      'See https://www.youtube.com/watch?v=dQw4w9WgXcQ here',
    );
    expect(watchHtml).toContain('/embed/dQw4w9WgXcQ');
  });

  it('embeds each linked video only once', () => {
    const html = render('[clip](https://youtu.be/pXSzMqregd8)');
    expect(html.match(/<iframe/g)?.length).toBe(1);
  });

  it('does not embed a player for non-YouTube links', () => {
    expect(render('[site](https://example.com)')).not.toContain('<iframe');
  });

  it('auto-links bare http(s) URLs in a new tab with an icon', () => {
    const html = render('Visit https://example.com today');
    expect(html).toContain(
      '<a href="https://example.com" rel="noopener noreferrer" target="_blank">https://example.com',
    );
    expect(html).toContain('fa-arrow-up-right-from-square');
  });

  it('keeps trailing punctuation outside an auto-linked URL', () => {
    const html = render('See https://example.com.');
    expect(html).toContain('<a href="https://example.com"');
    expect(html).toContain('</a>.');
    expect(html).not.toContain('href="https://example.com."');
  });

  it('links a bare YouTube URL and still embeds the player', () => {
    const html = render('Watch it here: https://youtu.be/pXSzMqregd8');
    expect(html).toContain(
      '<a href="https://youtu.be/pXSzMqregd8" rel="noopener noreferrer" target="_blank">',
    );
    expect(html).toContain(
      '<iframe src="https://www.youtube-nocookie.com/embed/pXSzMqregd8"',
    );
  });

  it('escapes raw HTML to prevent injection', () => {
    const html = render('<script>alert(1)</script>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('renders fenced code blocks', () => {
    const html = render('```\nconst x = 1;\n```');
    expect(html).toContain('<pre class="md-code"><code>');
  });

  it('handles null input', () => {
    expect(render(null as unknown as string)).toBe('');
  });

  it('handles multiple trailing punctuation marks', () => {
    const html = render('See https://example.com...');
    expect(html).toContain('<a href="https://example.com"');
    expect(html).toContain('</a>...');
  });

  it('handles empty input', () => {
    expect(render('')).toBe('');
  });

  it('renders horizontal rules', () => {
    expect(render('---')).toContain('<hr');
    expect(render('***')).toContain('<hr');
  });

  it('handles inline code with backticks', () => {
    const html = render('Use `const x = 1;` to declare');
    expect(html).toContain('<code>const x = 1;</code>');
  });

  it('handles bold with underscore', () => {
    expect(render('__bold__')).toContain('<strong>bold</strong>');
  });

  it('handles italic with underscore', () => {
    expect(render('_italic_')).toContain('<em>italic</em>');
  });

  it('keeps a bare URL unchanged when URL safety check fails', () => {
    const safeSpy = jest
      .spyOn(
        pipe as unknown as {
          isSafeUrl: (url: string) => boolean;
        },
        'isSafeUrl',
      )
      .mockReturnValue(false);

    const html = render('Visit https://example.com now');

    expect(html).toContain('https://example.com');
    expect(html).not.toContain('<a href="https://example.com"');
    safeSpy.mockRestore();
  });

  it('replaces unknown CODE placeholders with an empty string', () => {
    expect(render('CODE999')).toBe('');
  });

  describe('indents and spacers', () => {
    it('indents a paragraph opened with the marker', () => {
      expect(transform('{indent}A sentence.')).toBe(
        '<p class="sto-indent">A sentence.</p>',
      );
    });

    it('swallows the space between the marker and the first word', () => {
      expect(transform('{indent}   A sentence.')).toBe(
        '<p class="sto-indent">A sentence.</p>',
      );
    });

    it('still renders the rest of the paragraph as Markdown', () => {
      expect(transform('{indent}A **bold** word.')).toBe(
        '<p class="sto-indent">A <strong>bold</strong> word.</p>',
      );
    });

    // The marker means something in one place only, which is what saves the
    // renderer from needing an escape syntax it does not otherwise have.
    it('leaves the marker as text anywhere but the start of a paragraph', () => {
      expect(transform('A sentence {indent} interrupted.')).toBe(
        '<p>A sentence {indent} interrupted.</p>',
      );
      expect(transform('First line.\n{indent}Second line.')).toBe(
        '<p>First line.<br />{indent}Second line.</p>',
      );
    });

    it('matches the marker exactly, so a capital or a space is just text', () => {
      expect(transform('{Indent}A sentence.')).toBe(
        '<p>{Indent}A sentence.</p>',
      );
      expect(transform('{ indent }A sentence.')).toBe(
        '<p>{ indent }A sentence.</p>',
      );
    });

    it('renders a spacer block with nothing for a reader to hear', () => {
      expect(transform('{spacer}')).toBe(
        '<div class="sto-spacer" aria-hidden="true"></div>',
      );
    });

    it('leaves the blocks around a spacer alone', () => {
      expect(transform('First.\n\n{spacer}\n\nThird.')).toBe(
        [
          '<p>First.</p>',
          '<div class="sto-spacer" aria-hidden="true"></div>',
          '<p>Third.</p>',
        ].join('\n'),
      );
    });

    it('leaves the spacer as text when it is not a block of its own', () => {
      expect(transform('Before {spacer} after.')).toBe(
        '<p>Before {spacer} after.</p>',
      );
      expect(transform('A line.\n{spacer}')).toBe(
        '<p>A line.<br />{spacer}</p>',
      );
    });
  });
});
