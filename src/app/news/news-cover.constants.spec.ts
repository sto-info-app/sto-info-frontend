import {
  NEWS_COVER_ALT_MAX_LENGTH,
  NEWS_COVER_REQUIREMENT,
  NEWS_COVER_SPEC,
  newsCoverOf,
} from './news-cover.constants';

const URLS = {
  cover640x360: 'https://images.example/cover/cover640x360',
  cover1920x1080: 'https://images.example/cover/cover1920x1080',
};

describe('news cover constants', () => {
  // The server holds a site post's cover to a Fleet news cover's rules, so
  // the dialogue must ask for the same.
  it('asks for a 16:9 JPEG cover, at least 640 by 360', () => {
    expect(NEWS_COVER_SPEC).toEqual(
      expect.objectContaining({
        aspectRatio: 16 / 9,
        minimumWidth: 640,
        minimumHeight: 360,
        recommendedWidth: 1920,
        recommendedHeight: 1080,
        outputFormat: 'jpeg',
        endpoint: 'cover-image',
      }),
    );
    expect(NEWS_COVER_SPEC.guidance).toContain('home page');
    expect(NEWS_COVER_REQUIREMENT).toBe(
      '16:9, ideally 1920 by 1080 pixels or larger (640 by 360 at the smallest).',
    );
    expect(NEWS_COVER_ALT_MAX_LENGTH).toBe(300);
  });

  it('draws the small size on a card and the large one on the post', () => {
    const post = { coverImageUrls: URLS, coverImageAlt: 'A shipyard' };

    expect(newsCoverOf(post, 'card')).toEqual({
      url: URLS.cover640x360,
      alt: 'A shipyard',
    });
    expect(newsCoverOf(post, 'page')).toEqual({
      url: URLS.cover1920x1080,
      alt: 'A shipyard',
    });
  });

  it('reads an undescribed cover as decoration', () => {
    expect(
      newsCoverOf({ coverImageUrls: URLS, coverImageAlt: null }, 'card')?.alt,
    ).toBe('');
  });

  it('draws nothing for a post with no cover', () => {
    expect(
      newsCoverOf({ coverImageUrls: null, coverImageAlt: null }, 'page'),
    ).toBeNull();
  });
});
