import {
  BASE_CLOUDFLARE_IMAGES_URL,
  CLOUDFLARE_VARIANT_DEFAULT_NAME,
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
  bannerImageId: string | null;
  bannerImageAlt: string | null;
  emblemImageId: string | null;
  emblemImageAlt: string | null;
}

/** The emblem sizes anything in the Fleet section asks for. */
export const FLEET_EMBLEM_SIZES = {
  /** A row in a listing. */
  CARD: CLOUDFLARE_VARIANT_SQUARE_100PX_NAME,
  /** The head of a scope's own page. */
  PAGE: CLOUDFLARE_VARIANT_SQUARE_300PX_NAME,
};

/**
 * Turns an image reference into somewhere to fetch the picture from.
 *
 * Done here rather than at each call site so that nothing drawing a scope
 * has to know where images are kept.
 *
 * @param imageId - The reference, or null when there is no picture.
 * @param alt - What the picture shows, where anybody said.
 * @param variant - Which size to ask for.
 * @returns The picture, or null when there is none.
 */
function pictureOf(
  imageId: string | null,
  alt: string | null,
  variant: string,
): FleetPicture | null {
  if (imageId === null) {
    return null;
  }

  return {
    url: `${BASE_CLOUDFLARE_IMAGES_URL}/${imageId}/${variant}`,
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
  return pictureOf(source.emblemImageId, source.emblemImageAlt, variant);
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
  return pictureOf(
    source.bannerImageId,
    source.bannerImageAlt,
    CLOUDFLARE_VARIANT_DEFAULT_NAME,
  );
}
