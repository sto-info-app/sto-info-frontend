import { DomSanitizer } from '@angular/platform-browser';

import {
  trustedYouTubeEmbed,
  trustedYouTubeEmbedUrl,
} from './youtube-embed.utility';

describe('the YouTube embed guard', () => {
  const trusted: string[] = [];
  const sanitizer = {
    bypassSecurityTrustResourceUrl: (url: string) => {
      trusted.push(url);

      return url;
    },
  } as unknown as DomSanitizer;

  beforeEach(() => {
    trusted.length = 0;
  });

  describe('trustedYouTubeEmbedUrl', () => {
    it.each([
      'https://www.youtube.com/watch?v=abcdefghijk',
      'https://www.youtube.com/redirect?q=https://example.com',
      'https://www.youtube.com/embed/short',
      'https://www.youtube.com/embed/abcdefghijk/extra',
      'https://www.youtube.com:8443/embed/abcdefghijk',
      'https://user:password@www.youtube.com/embed/abcdefghijk',
      'https://www.youtube.com.example.com/embed/abcdefghijk',
    ])('refuses a URL outside the permitted embed shape: %s', address => {
      expect(trustedYouTubeEmbedUrl(sanitizer, address, false)).toBeNull();
      expect(trusted).toEqual([]);
    });

    it('sets autoplay before the fragment and replaces an existing value', () => {
      expect(
        trustedYouTubeEmbedUrl(
          sanitizer,
          'https://www.youtube.com/embed/abcdefghijk?autoplay=0#player',
          true,
        ),
      ).toBe('https://www.youtube.com/embed/abcdefghijk?autoplay=1#player');
    });

    it('trusts an embed on a YouTube host', () => {
      const result = trustedYouTubeEmbedUrl(
        sanitizer,
        'https://www.youtube-nocookie.com/embed/abcdefghijk',
        false,
      );

      expect(result).toBe('https://www.youtube-nocookie.com/embed/abcdefghijk');
    });

    it('adds autoplay where playback was asked for', () => {
      expect(
        trustedYouTubeEmbedUrl(
          sanitizer,
          'https://www.youtube.com/embed/abcdefghijk',
          true,
        ),
      ).toBe('https://www.youtube.com/embed/abcdefghijk?autoplay=1');
    });

    it('joins autoplay onto a query that is already there', () => {
      expect(
        trustedYouTubeEmbedUrl(
          sanitizer,
          'https://www.youtube.com/embed/abcdefghijk?start=90',
          true,
        ),
      ).toBe('https://www.youtube.com/embed/abcdefghijk?start=90&autoplay=1');
    });

    // The whole reason this helper exists: an iframe source is the one place a
    // stored string becomes something the browser will execute against.
    it('refuses a host that is not YouTube', () => {
      expect(
        trustedYouTubeEmbedUrl(sanitizer, 'https://example.com/embed/x', false),
      ).toBeNull();
      expect(trusted).toEqual([]);
    });

    it('refuses anything that is not HTTPS', () => {
      expect(
        trustedYouTubeEmbedUrl(
          sanitizer,
          'http://www.youtube.com/embed/abcdefghijk',
          false,
        ),
      ).toBeNull();
    });

    it('refuses something that is not an address at all', () => {
      expect(trustedYouTubeEmbedUrl(sanitizer, 'not a url', false)).toBeNull();
    });
  });

  describe('trustedYouTubeEmbed', () => {
    it('builds a no-cookie embed from an identifier', () => {
      expect(trustedYouTubeEmbed(sanitizer, 'abcdefghijk')).toBe(
        'https://www.youtube-nocookie.com/embed/abcdefghijk',
      );
    });

    it('carries the offset and autoplay where both were asked for', () => {
      expect(
        trustedYouTubeEmbed(sanitizer, 'abcdefghijk', {
          startSeconds: 90,
          autoplay: true,
        }),
      ).toBe(
        'https://www.youtube-nocookie.com/embed/abcdefghijk?start=90&autoplay=1',
      );
    });

    it('starts at the front where no offset was recorded', () => {
      expect(
        trustedYouTubeEmbed(sanitizer, 'abcdefghijk', { startSeconds: null }),
      ).toBe('https://www.youtube-nocookie.com/embed/abcdefghijk');
    });

    // A stored identifier is checked before an address is built from it, not
    // after: the check is worthless once the string is already in the URL.
    it('refuses an identifier that is not one', () => {
      expect(trustedYouTubeEmbed(sanitizer, 'abc')).toBeNull();
      expect(trustedYouTubeEmbed(sanitizer, '../../evil/thing')).toBeNull();
      expect(trusted).toEqual([]);
    });
  });
});
