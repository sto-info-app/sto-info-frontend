import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { MarkdownPipe } from './markdown.pipe';

describe('MarkdownPipe', () => {
  let pipe: MarkdownPipe;
  let lastHtml = '';

  beforeEach(() => {
    const sanitizerStub: Partial<DomSanitizer> = {
      bypassSecurityTrustHtml: (html: string) => {
        lastHtml = html;
        return html;
      },
    };
    TestBed.configureTestingModule({
      providers: [
        MarkdownPipe,
        { provide: DomSanitizer, useValue: sanitizerStub },
      ],
    });
    pipe = TestBed.inject(MarkdownPipe);
  });

  const render = (input: string): string => {
    pipe.transform(input);
    return lastHtml;
  };

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
});
