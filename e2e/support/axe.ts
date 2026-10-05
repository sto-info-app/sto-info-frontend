import AxeBuilder from '@axe-core/playwright';
import { expect, Page } from '@playwright/test';

/**
 * Scans a page's main content with axe against WCAG 2.1 A and AA (FC-044).
 *
 * Scoped to `main`: the site's frame is shared by every page and is checked
 * with Help's.
 *
 * @param page - The page.
 * @param what - What it is, for the failure message.
 */
export async function noViolations(page: Page, what: string): Promise<void> {
  const { violations } = await new AxeBuilder({ page })
    .include('main')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(
    violations.map(
      violation =>
        `${violation.id}: ${violation.help} (${violation.nodes
          .slice(0, 3)
          .map(node => node.target.join(' '))
          .join('; ')})`,
    ),
    what,
  ).toEqual([]);
}
