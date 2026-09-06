import {
  CustomTrackingSectionTree,
  CustomTrackingTabTree,
} from 'src/app/models/custom-tracking.models';

/**
 * Whether a name or description mentions what is being looked for.
 *
 * @param term - What is being looked for, already lowercased.
 * @param name - What the thing is called.
 * @param description - What it is for, or null.
 * @returns True when either mentions the term.
 */
function mentions(
  term: string,
  name: string,
  description: string | null,
): boolean {
  return (
    name.toLowerCase().includes(term) ||
    (description ?? '').toLowerCase().includes(term)
  );
}

/**
 * Narrows a tab to the fields that match, keeping it whole if it matches.
 *
 * A tab whose own name matches keeps every field, because somebody searching
 * for a tab means the tab and not a subset of what is in it.
 *
 * @param tab - The tab.
 * @param term - What is being looked for, already lowercased.
 * @returns The tab as it should be shown, or null when nothing in it matches.
 */
function filterTab(
  tab: CustomTrackingTabTree,
  term: string,
): CustomTrackingTabTree | null {
  if (mentions(term, tab.name, tab.description)) {
    return tab;
  }

  const fields = tab.fields.filter(field =>
    mentions(term, field.name, field.description),
  );

  return fields.length === 0 ? null : { ...tab, fields };
}

/**
 * Narrows the hierarchy to what mentions a search term.
 *
 * The builder searches everything it has rather than only the branches
 * somebody has opened, which is why the whole scope is loaded in one request.
 * A search that could see only the open branches would quietly miss what it
 * was asked for, and a user would conclude the field was gone.
 *
 * Ancestors of a match are kept even where they do not match themselves. A
 * field found on its own with no section or tab around it says nothing about
 * where to go and change it.
 *
 * @param sections - The whole hierarchy, in order.
 * @param term - What is being looked for.
 * @returns The parts of it worth showing, in the same order.
 */
export function filterDefinitions(
  sections: CustomTrackingSectionTree[],
  term: string,
): CustomTrackingSectionTree[] {
  const wanted = term.trim().toLowerCase();

  if (wanted === '') {
    return sections;
  }

  const matched: CustomTrackingSectionTree[] = [];

  for (const section of sections) {
    if (mentions(wanted, section.name, section.description)) {
      matched.push(section);
      continue;
    }

    const tabs = section.tabs
      .map(tab => filterTab(tab, wanted))
      .filter((tab): tab is CustomTrackingTabTree => tab !== null);

    if (tabs.length > 0) {
      matched.push({ ...section, tabs });
    }
  }

  return matched;
}

/**
 * Counts the live fields in a whole scope.
 *
 * Counted from the hierarchy rather than asked for separately, so the figure
 * shown against the published ceiling is the same one the page is drawn from
 * and cannot disagree with it.
 *
 * @param sections - The whole hierarchy.
 * @returns How many fields it holds.
 */
export function countFields(sections: CustomTrackingSectionTree[]): number {
  return sections.reduce(
    (total, section) =>
      total +
      section.tabs.reduce((inSection, tab) => inSection + tab.fields.length, 0),
    0,
  );
}
