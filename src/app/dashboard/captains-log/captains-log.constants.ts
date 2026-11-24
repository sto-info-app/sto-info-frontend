import {
  describeFleetImageRequirement,
  FLEET_IMAGE_SPECS,
  FleetImageSlot,
  FleetImageSpec,
} from 'src/app/fleet/fleet-image.constants';
import {
  LogEntryType,
  PublicLogEntry,
} from 'src/app/models/captains-log.models';
import {
  NewsCover,
  newsCoverOf,
  NewsCoverSize,
} from 'src/app/news/news-cover.constants';
import { formatStardate } from 'src/app/shared/utils/stardate.utils';

/** The longest headline the server accepts. */
export const LOG_HEADLINE_MAX_LENGTH = 120;

/** The longest body the server accepts, in Markdown. */
export const LOG_BODY_MAX_LENGTH = 10000;

/** The longest reason a site admin may give for removing an entry. */
export const LOG_REMOVAL_REASON_MAX_LENGTH = 500;

/** How many entries a page holds. */
export const LOG_PAGE_SIZE = 20;

/** The longest picture description the server accepts: a Fleet cover's. */
export { FLEET_IMAGE_ALT_MAX_LENGTH as LOG_PICTURE_ALT_MAX_LENGTH } from 'src/app/fleet/fleet-image.constants';

/**
 * The picture an entry may carry: a news cover's shape and sizes, which the
 * server holds it to, sent to the entry's own picture address.
 */
export const LOG_PICTURE_SPEC: FleetImageSpec = {
  ...FLEET_IMAGE_SPECS[FleetImageSlot.COVER],
  label: 'Picture',
  guidance: 'The picture shown at the head of the entry.',
  endpoint: 'picture',
};

/** The shape and size requirement, as an author is told it. */
export const LOG_PICTURE_REQUIREMENT = describeFleetImageRequirement(
  FleetImageSlot.COVER,
);

/** What each type of entry is called. */
export const LOG_TYPE_LABELS: Readonly<Record<LogEntryType, string>> = {
  [LogEntryType.CAPTAIN]: "Captain's",
  [LogEntryType.PERSONAL]: 'Personal',
};

/** What each type of entry means, beside its choice in the editor. */
export const LOG_TYPE_HINTS: Readonly<Record<LogEntryType, string>> = {
  [LogEntryType.CAPTAIN]:
    'Shown on your public profile while your profile is publicly visible.',
  [LogEntryType.PERSONAL]: 'Only ever shown to you.',
};

/**
 * The headline an entry has when its author gives it none, worked out as
 * the server does.
 *
 * @param type - Captain's or Personal.
 * @param stardate - The stardate it was written on.
 * @returns e.g. "Captain's Log stardate 104502.6".
 */
export function defaultLogHeadline(
  type: LogEntryType,
  stardate: number,
): string {
  return `${LOG_TYPE_LABELS[type]} Log stardate ${formatStardate(stardate)}`;
}

/**
 * The picture to draw for an entry at one size, or null when it has none.
 * An entry's picture is delivered through a news cover's variants, so it is
 * chosen the same way.
 *
 * @param entry - The entry.
 * @param size - On a card in a list, or at the head of the page.
 * @returns Its address and description, or null.
 */
export function logPictureOf(
  entry: Pick<PublicLogEntry, 'pictureUrls' | 'pictureAlt'>,
  size: NewsCoverSize,
): NewsCover | null {
  return newsCoverOf(
    { coverImageUrls: entry.pictureUrls, coverImageAlt: entry.pictureAlt },
    size,
  );
}
