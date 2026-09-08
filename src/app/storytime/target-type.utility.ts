import { StorytimeTargetType } from 'src/app/models/storytime.models';

/**
 * Writes the kind of content as a URL says it.
 *
 * The vocabulary is upper case because that is how the database spells it, and
 * it stays that way in request bodies and in everything the API returns. A URL
 * is the one place it should not shout, so the path segment is lowered here —
 * in one place, because three services build one of these paths and a rule
 * about how a URL is written should not be restated by each of them.
 *
 * @param targetType - The kind of content.
 * @returns The segment naming it.
 */
export function targetTypeSegment(targetType: StorytimeTargetType): string {
  return targetType.toLowerCase();
}
