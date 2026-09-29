import {
  CLOUDFLARE_VARIANT_SQUARE_100PX_NAME,
  CLOUDFLARE_VARIANT_SQUARE_300PX_NAME,
} from 'src/app/shared/constants/app-image-assets.constants';

/** A picture to draw, and what it shows. */
export interface FleetPicture {
  /** Where to fetch it from. */
  url: string;

  /** What it shows. Empty when nobody said, which is valid markup. */
  alt: string;
}

/** The artwork columns a scope record carries, as the server sends them. */
export interface FleetArtworkSource {
  bannerImageAlt: string | null;
  /** The banner's signed address, from the API (FC-040). */
  bannerImageUrl: string | null;
  emblemImageAlt: string | null;
  /** The emblem's signed addresses by variant, from the API (FC-040). */
  emblemImageUrls: Record<string, string> | null;
}

/** The emblem sizes anything in the Fleet section asks for. */
export const FLEET_EMBLEM_SIZES = {
  /** A row in a listing. */
  CARD: CLOUDFLARE_VARIANT_SQUARE_100PX_NAME,
  /** The head of a scope's own page. */
  PAGE: CLOUDFLARE_VARIANT_SQUARE_300PX_NAME,
};

/**
 * A picture to draw, from the address the API signed.
 *
 * The browser never builds a picture's address (FC-040): each is signed by
 * the API for as long as the picture may be shown, and one built here would
 * be refused.
 *
 * @param url - The signed address, or null.
 * @param alt - What the picture shows, where anybody said.
 * @returns The picture, or null when there is none.
 */
function pictureOf(
  url: string | null | undefined,
  alt: string | null,
): FleetPicture | null {
  if (!url) {
    return null;
  }

  return {
    url,
    // An empty description is the right markup for a picture nobody
    // described, and reads as decoration rather than a missing sentence.
    alt: alt ?? '',
  };
}

/**
 * The scope's square emblem.
 *
 * @param source - The record's artwork columns.
 * @param variant - Which size to ask for.
 * @returns The emblem, or null when the scope has none.
 */
export function emblemOf(
  source: FleetArtworkSource,
  variant: string,
): FleetPicture | null {
  return pictureOf(source.emblemImageUrls?.[variant], source.emblemImageAlt);
}

/**
 * The scope's wide banner.
 *
 * Always the original upload. A banner is five times as wide as it is tall
 * and runs the width of a page, so the square variants would crop it to
 * nothing and there is no sensible smaller one to ask for.
 *
 * @param source - The record's artwork columns.
 * @returns The banner, or null when the scope has none.
 */
export function bannerOf(source: FleetArtworkSource): FleetPicture | null {
  return pictureOf(source.bannerImageUrl, source.bannerImageAlt);
}
