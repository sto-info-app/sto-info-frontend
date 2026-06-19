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
