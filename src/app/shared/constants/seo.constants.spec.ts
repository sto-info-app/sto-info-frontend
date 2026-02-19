jest.mock('src/environments/environment', () => ({
  environment: { appTitle: 'Test App Title' },
}));

import {
  SEO_APP_TITLE,
  SEO_DESCRIPTION,
  SEO_TWITTER_HANDLE,
  SEO_AUTHOR,
  SEO_SITE_URL,
  SEO_OG_IMAGE_URL,
  SEO_TWITTER_IMAGE_URL,
} from './seo.constants';

describe('seo.constants', () => {
  it('should use environment appTitle for SEO_APP_TITLE', () => {
    expect(SEO_APP_TITLE).toBe('Test App Title');
  });

  it('should export SEO_DESCRIPTION as a non-empty string', () => {
    expect(SEO_DESCRIPTION).toBeDefined();
    expect(SEO_DESCRIPTION.length).toBeGreaterThan(0);
    expect(SEO_DESCRIPTION).toContain('Star Trek Online');
  });

  it('should export SEO_TWITTER_HANDLE', () => {
    expect(SEO_TWITTER_HANDLE).toMatch(/^@/);
  });

  it('should export SEO_AUTHOR', () => {
    expect(SEO_AUTHOR).toBeDefined();
    expect(SEO_AUTHOR.length).toBeGreaterThan(0);
  });

  it('should export SEO_SITE_URL ending with slash', () => {
    expect(SEO_SITE_URL).toBeDefined();
    expect(SEO_SITE_URL.endsWith('/')).toBe(true);
  });

  it('should export SEO_OG_IMAGE_URL and SEO_TWITTER_IMAGE_URL', () => {
    expect(SEO_OG_IMAGE_URL).toContain('og-1200x630');
    expect(SEO_TWITTER_IMAGE_URL).toContain('twitter-1200x675');
  });
});
