import {
  bannerOf,
  emblemOf,
  FLEET_EMBLEM_SIZES,
  FleetArtworkSource,
} from './fleet-artwork';

const SIGNED = 'https://cdn.test/cdn-cgi/imagedelivery/hash';

/**
 * Builds a record's artwork as the server sends it.
 *
 * @param overrides - Fields to override.
 * @returns The artwork.
 */
function artwork(
  overrides: Partial<FleetArtworkSource> = {},
): FleetArtworkSource {
  return {
    bannerImageAlt: null,
    bannerImageUrl: null,
    emblemImageAlt: null,
    emblemImageUrls: null,
    ...overrides,
  };
}

// FC-040: the API signs every address; the browser only draws them.
describe('fleet-artwork', () => {
  describe('emblemOf', () => {
    it('draws the size the caller wants, from the address the API signed', () => {
      const source = artwork({
        emblemImageUrls: {
          square100: `${SIGNED}/emblem-ref/square100?sig=1`,
          square300: `${SIGNED}/emblem-ref/square300?sig=3`,
        },
        emblemImageAlt: 'A crossed-sabres badge',
      });

      expect(emblemOf(source, FLEET_EMBLEM_SIZES.CARD)).toEqual({
        url: `${SIGNED}/emblem-ref/square100?sig=1`,
        alt: 'A crossed-sabres badge',
      });
      expect(emblemOf(source, FLEET_EMBLEM_SIZES.PAGE)?.url).toBe(
        `${SIGNED}/emblem-ref/square300?sig=3`,
      );
    });

    it('draws nothing where the scope has no emblem, or none at that size', () => {
      expect(emblemOf(artwork(), FLEET_EMBLEM_SIZES.CARD)).toBeNull();
      expect(
        emblemOf(artwork({ emblemImageUrls: {} }), FLEET_EMBLEM_SIZES.CARD),
      ).toBeNull();
    });

    it('falls back to an empty description, which is valid markup', () => {
      const found = emblemOf(
        artwork({ emblemImageUrls: { square100: `${SIGNED}/e/square100` } }),
        FLEET_EMBLEM_SIZES.CARD,
      );

      expect(found?.alt).toBe('');
    });
  });

  describe('bannerOf', () => {
    it('draws the banner from its signed address', () => {
      const found = bannerOf(
        artwork({
          bannerImageUrl: `${SIGNED}/banner-ref/public?sig=b`,
          bannerImageAlt: 'A fleet yard at dusk',
        }),
      );

      expect(found).toEqual({
        url: `${SIGNED}/banner-ref/public?sig=b`,
        alt: 'A fleet yard at dusk',
      });
    });

    it('draws nothing where the scope has no banner', () => {
      expect(bannerOf(artwork())).toBeNull();
    });
  });
});
