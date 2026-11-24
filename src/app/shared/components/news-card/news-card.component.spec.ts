import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { NewsCategory, NewsPost, NewsStatus } from 'src/app/models/news.models';
import { RoutingService } from 'src/app/shared/services/routing.service';

import { NewsCardComponent } from './news-card.component';

/**
 * A published post with no cover.
 *
 * @param overrides - Whatever the case is about.
 * @returns The post.
 */
const buildPost = (overrides: Partial<NewsPost> = {}): NewsPost => ({
  id: '1',
  slug: 'v1-5-release-notes',
  title: 'Version 1.5',
  summary: 'What changed.',
  body: '# Body',
  category: NewsCategory.RELEASE_NOTES,
  status: NewsStatus.PUBLISHED,
  publishedAt: '2026-11-20T12:00:00Z',
  authorId: null,
  coverImageId: null,
  coverImageAlt: null,
  coverImageUrls: null,
  createdAt: '',
  updatedAt: '',
  ...overrides,
});

describe('NewsCardComponent', () => {
  let fixture: ComponentFixture<NewsCardComponent>;

  /**
   * Draws the card for a post.
   *
   * @param post - The post.
   * @returns The rendered element.
   */
  const render = (post: NewsPost): HTMLElement => {
    fixture = TestBed.createComponent(NewsCardComponent);
    fixture.componentRef.setInput('post', post);
    fixture.detectChanges();

    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NewsCardComponent],
      providers: [
        provideRouter([]),
        {
          provide: RoutingService,
          useValue: { getLink: (route: string) => `/${route}` },
        },
      ],
    });
  });

  it('names the post and links to it', () => {
    const card = render(buildPost());

    expect(card.querySelector('.news-title a')?.textContent?.trim()).toBe(
      'Version 1.5',
    );
    expect(card.querySelector('.news-title a')?.getAttribute('href')).toContain(
      'news/v1-5-release-notes',
    );
  });

  // The card is drawn on News and on the home page alike, so both show the
  // cover (sc-1447), card-sized and described.
  it('shows the cover card-sized, with its description', () => {
    const card = render(
      buildPost({
        coverImageId: 'cover',
        coverImageAlt: 'The new shipyard',
        coverImageUrls: {
          cover640x360: 'https://images.example/cover/cover640x360',
          cover1920x1080: 'https://images.example/cover/cover1920x1080',
        },
      }),
    );

    const cover = card.querySelector('img.news-cover');
    expect(cover?.getAttribute('src')).toBe(
      'https://images.example/cover/cover640x360',
    );
    expect(cover?.getAttribute('alt')).toBe('The new shipyard');
  });

  it('draws no picture for a post with no cover', () => {
    const card = render(buildPost());

    expect(card.querySelector('img')).toBeNull();
  });
});
