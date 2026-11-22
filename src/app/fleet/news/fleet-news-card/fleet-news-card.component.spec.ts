import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { newsPost } from 'src/app/fleet/news/fleet-news.testing';
import { FleetNewsPostSummary } from 'src/app/models/fleet-news.models';
import { pageText } from 'src/app/fleet/recruitment/recruitment.testing';

import { FleetNewsCardComponent } from './fleet-news-card.component';

const LINK = ['/fleets', 'communities', 'midnite', 'news', 'refit-night-abc'];
const POST_HREF = '/fleets/communities/midnite/news/refit-night-abc';

const COVERS = {
  cover640x360:
    'https://cdn.test/cdn-cgi/imagedelivery/hash/cover-1/cover640x360?sig=c',
  cover1920x1080:
    'https://cdn.test/cdn-cgi/imagedelivery/hash/cover-1/cover1920x1080?sig=c',
};

describe('FleetNewsCardComponent', () => {
  let fixture: ComponentFixture<FleetNewsCardComponent>;

  /**
   * Draws a post's card.
   *
   * @param post - The post.
   */
  async function render(post: FleetNewsPostSummary): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [FleetNewsCardComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(FleetNewsCardComponent);
    fixture.componentRef.setInput('post', post);
    fixture.componentRef.setInput('link', LINK);
    fixture.detectChanges();
  }

  /** @returns The card's element. */
  const card = (): HTMLElement => fixture.nativeElement as HTMLElement;

  /** @returns Each link's text, label and address. */
  function links(): {
    text: string;
    label: string | null;
    href: string | null;
  }[] {
    return Array.from(card().querySelectorAll('a')).map(link => ({
      text: String(link.textContent).trim(),
      label: link.getAttribute('aria-label'),
      href: link.getAttribute('href'),
    }));
  }

  it('shows a published post as the site’s news cards do', async () => {
    await render(
      newsPost({
        coverImageId: 'cover-1',
        coverImageUrls: COVERS,
        coverImageAlt: 'The fleet',
      }),
    );

    const text = pageText(fixture);

    expect(
      card().querySelector('.fleet-news-card__audience')?.textContent,
    ).toBe('Public');
    expect(card().querySelector('time')?.getAttribute('datetime')).toBe(
      '2026-09-28T10:00:00.000Z',
    );
    expect(text).toContain('Refit night');
    expect(text).toContain('Bring your ships.');
    expect(text).toContain('Posted by FleetOwner');
    expect(text).not.toContain('Draft');
    expect(card().querySelector('.fleet-news-card--draft')).toBeNull();
    expect(links()).toEqual([
      { text: 'Refit night', label: null, href: POST_HREF },
      {
        text: 'FleetOwner',
        label: null,
        href: '/community/registry/profiles/FleetOwner',
      },
      { text: 'Read more', label: null, href: POST_HREF },
      { text: '', label: 'Read Refit night', href: POST_HREF },
    ]);
  });

  // A card is drawn small, so it fetches the small cover, not the post's.
  it('fetches the cover at a card’s size', async () => {
    await render(
      newsPost({
        coverImageId: 'cover-1',
        coverImageUrls: COVERS,
        coverImageAlt: 'The fleet',
      }),
    );

    const image = card().querySelector('img');

    expect(image?.getAttribute('src')).toBe(COVERS.cover640x360);
    expect(image?.getAttribute('alt')).toBe('The fleet');
  });

  it('draws no picture for a post with no cover', async () => {
    await render(newsPost());

    expect(card().querySelector('img')).toBeNull();
  });

  // The words of a detail are separate items, spaced by the row's gap; the
  // text still reads with its spaces for anybody who reads it out.
  it('marks a draft, and says when it last changed', async () => {
    await render(newsPost({ status: 'DRAFT', publishedAt: null }));

    const text = pageText(fixture);
    const date = card().querySelector('.fleet-news-card__date');

    expect(card().querySelector('.fleet-news-card--draft')).not.toBeNull();
    expect(text).toContain('Draft');
    expect(date?.querySelector('span')?.textContent).toBe('Last changed ');
    expect(date?.querySelector('time')?.getAttribute('datetime')).toBe(
      '2026-09-28T09:30:00.000Z',
    );
  });

  it('names who may read it', async () => {
    await render(newsPost({ audience: 'FLEET_MEMBERS' }));

    expect(
      card().querySelector('.fleet-news-card__audience')?.textContent,
    ).toBe('Members only');
  });

  it('names an author it may not link to, and none when nobody can be named', async () => {
    await render(
      newsPost({ author: { username: 'Hidden', linksToProfile: false } }),
    );

    expect(pageText(fixture)).toContain('Posted by Hidden');
    expect(links().map(link => link.text)).not.toContain('Hidden');

    fixture.componentRef.setInput('post', newsPost({ author: null }));
    fixture.detectChanges();

    expect(pageText(fixture)).not.toContain('Posted by');
  });

  it('leaves out a summary it does not have', async () => {
    await render(newsPost({ summary: null }));

    expect(card().querySelector('.fleet-news-card__summary')).toBeNull();
  });
});
