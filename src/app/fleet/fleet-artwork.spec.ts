import { BASE_CLOUDFLARE_IMAGES_URL } from 'src/app/shared/constants/app-image-assets.constants';

import {
  bannerOf,
  emblemOf,
  FLEET_EMBLEM_SIZES,
  FleetArtworkSource,
} from './fleet-artwork';

/**
 * Builds a record's artwork columns.
 *
 * @param overrides - Columns to override.
 * @returns The artwork as the server sends it.
 */
function artwork(
  overrides: Partial<FleetArtworkSource> = {},
): FleetArtworkSource {
  return {
    bannerImageId: null,
    bannerImageAlt: null,
    emblemImageId: null,
    emblemImageAlt: null,
    ...overrides,
  };
}

describe('fleet-artwork', () => {
  describe('emblemOf', () => {
    it('asks for the size the caller wants', () => {
      const source = artwork({
        emblemImageId: 'emblem-ref',
        emblemImageAlt: 'A crossed-sabres badge',
      });

      expect(emblemOf(source, FLEET_EMBLEM_SIZES.CARD)).toEqual({
        url: `${BASE_CLOUDFLARE_IMAGES_URL}/emblem-ref/square100`,
        alt: 'A crossed-sabres badge',
      });
      expect(emblemOf(source, FLEET_EMBLEM_SIZES.PAGE)?.url).toBe(
        `${BASE_CLOUDFLARE_IMAGES_URL}/emblem-ref/square300`,
      );
    });

    it('draws nothing where the scope has no emblem', () => {
      expect(emblemOf(artwork(), FLEET_EMBLEM_SIZES.CARD)).toBeNull();
    });

    it('falls back to an empty description, which is valid markup', () => {
      const found = emblemOf(
        artwork({ emblemImageId: 'emblem-ref' }),
        FLEET_EMBLEM_SIZES.CARD,
      );

      expect(found?.alt).toBe('');
    });
  });

  describe('bannerOf', () => {
    // A banner is five times as wide as it is tall, so the square variants
    // would crop it to nothing.
    it('always asks for the original upload', () => {
      const found = bannerOf(
        artwork({
          bannerImageId: 'banner-ref',
          bannerImageAlt: 'A fleet yard at dusk',
        }),
      );

      expect(found).toEqual({
        url: `${BASE_CLOUDFLARE_IMAGES_URL}/banner-ref/public`,
        alt: 'A fleet yard at dusk',
      });
    });

    it('draws nothing where the scope has no banner', () => {
      expect(bannerOf(artwork())).toBeNull();
    });
  });
});
