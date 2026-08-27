import { StorytimeTag } from 'src/app/models/storytime.models';
import { TAG_CATEGORY_LABELS } from './storytime.constants';

/** A shelf of tags, as the pickers and the admin list show them. */
export interface StorytimeTagGroup {
  /** The category the shelf holds. */
  category: string;

  /** How the category is named to a reader. */
  label: string;

  /** The tags in it, in the order they arrived. */
  tags: StorytimeTag[];
}

/**
 * Groups the vocabulary into the shelves it is shown on.
 *
 * The order tags arrive in is the order the server considers correct, so it is
 * kept rather than sorted again here.
 *
 * @param tags - The whole vocabulary, already in order.
 * @returns The tags by category.
 */
export function groupTagsByCategory(tags: StorytimeTag[]): StorytimeTagGroup[] {
  const groups = new Map<string, StorytimeTag[]>();

  for (const tag of tags) {
    groups.set(tag.category, [...(groups.get(tag.category) ?? []), tag]);
  }

  return [...groups.entries()].map(([category, categoryTags]) => ({
    category,
    label: TAG_CATEGORY_LABELS[category] ?? category,
    tags: categoryTags,
  }));
}
