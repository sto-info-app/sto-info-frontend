import { expect, Locator, Page } from '@playwright/test';

/**
 * Open a published section, if it is not open already.
 *
 * On a public page the section's name is the heading. The control beside it
 * is named Expand or Collapse, and the sections start open — a visitor should
 * not have to discover that there is something to press — so this checks
 * before pressing rather than pressing regardless, which would fold the
 * section away and make the journey prove the opposite of what it meant to.
 */
export async function openPublishedSection(
  page: Page,
  name: string,
): Promise<Locator> {
  const heading = page.getByRole('heading', { name, exact: true });

  // The title is drawn in an absolutely positioned span, so the heading
  // element itself has no box. Attachment is the check that it is there.
  await expect(heading).toBeAttached();

  const toggle = heading
    .locator('xpath=ancestor::section[1]')
    .getByRole('button', { name: /^(Expand|Collapse)$/ });

  await expect(toggle).toBeVisible();

  if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
    await toggle.click();
  }

  await expect(toggle).toHaveAttribute('aria-expanded', 'true');

  return toggle;
}
