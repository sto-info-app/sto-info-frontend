import { expect, Locator, Page } from '@playwright/test';

import { escapeForRegExp } from './custom-tracking.page';

/**
 * Open a published section, if it is not open already.
 *
 * On a detail page the sections start open — a visitor should not have to
 * discover that there is something to press — so this checks before pressing
 * rather than pressing regardless, which would fold the section away and make
 * the journey prove the opposite of what it meant to.
 */
export async function openPublishedSection(
  page: Page,
  name: string,
): Promise<Locator> {
  const toggle = page.getByRole('button', {
    name: new RegExp(`^${escapeForRegExp(name)}$`),
  });

  await expect(toggle).toBeVisible();

  if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
    await toggle.click();
  }

  await expect(toggle).toHaveAttribute('aria-expanded', 'true');

  return toggle;
}
