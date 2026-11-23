import {
  describeFleetImageRequirement,
  FLEET_IMAGE_ALT_MAX_LENGTH,
  FLEET_IMAGE_SPECS,
  FleetImageSpec,
  FleetImageSlot,
} from 'src/app/fleet/fleet-image.constants';
import { NewsPost } from 'src/app/models/news.models';

/**
 * The cover one of the site's own news posts may carry (sc-1447).
 *
 * The shape, sizes and address of a Fleet news cover, which is the same job
 * and is held to the same rules by the server; only where it is shown is put
 * differently.
 */
export const NEWS_COVER_SPEC: FleetImageSpec = {
  ...FLEET_IMAGE_SPECS[FleetImageSlot.COVER],
  guidance:
    'The picture heading the post, and shown on its card in News and on ' +
    'the home page.',
};

/** The shape and size requirement, as an administrator is told it. */
export const NEWS_COVER_REQUIREMENT = describeFleetImageRequirement(
  FleetImageSlot.COVER,
);

/** The longest description the server accepts. */
export const NEWS_COVER_ALT_MAX_LENGTH = FLEET_IMAGE_ALT_MAX_LENGTH;

/** Where a cover is drawn: on a card, or at the head of its post. */
export type NewsCoverSize = 'card' | 'page';

/** A cover ready to draw. */
export interface NewsCover {
  readonly url: string;
  readonly alt: string;
}

/**
 * The cover to draw for a post at one size, or null when it has none.
 *
 * @param post - The post.
 * @param size - Where it is drawn.
 * @returns Its address and description, or null.
 */
export function newsCoverOf(
  post: Pick<NewsPost, 'coverImageUrls' | 'coverImageAlt'>,
  size: NewsCoverSize,
): NewsCover | null {
  const urls = post.coverImageUrls;

  if (!urls) {
    return null;
  }

  return {
    url: size === 'card' ? urls.cover640x360 : urls.cover1920x1080,
    // An empty description reads as decoration rather than a gap.
    alt: post.coverImageAlt ?? '',
  };
}
