import AxeBuilder from '@axe-core/playwright';
import { expect, Page, test } from '@playwright/test';

import helpManifest from '../../src/app/static-pages/help/help-guide-slugs.json';

/**
 * Help, as a stranger meets it (FC-048).
 *
 * Help is public, so nothing here signs in and none of it needs the seed
 * password: it runs as the `public` project, on its own.
 *
 * - The Help home is one tile per section, each leading to the section's page.
 * - Every guide address from before FC-048 still opens its guide.
 * - The keyboard reaches a tile and opens it, and Back returns the reader.
 * - At 375px nothing scrolls sideways.
 * - axe finds nothing on the three pages, scoped to Help's own markup: the
 *   site's frame is shared by every page and is not Help's to answer for.
 */

/**
 * Scans part of a page with axe against WCAG 2.1 A and AA.
 *
 * @param page - The page.
 * @param within - The selector to scan inside.
 */
const noViolations = async (page: Page, within: string): Promise<void> => {
  const { violations } = await new AxeBuilder({ page })
    .include(within)
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(
    violations.map(violation => `${violation.id}: ${violation.help}`),
  ).toEqual([]);
};

/**
 * Whether the page is wider than the window.
 *
 * @param page - The page.
 * @returns True when it scrolls sideways.
 */
const scrollsSideways = (page: Page): Promise<boolean> =>
  page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);

const tiles = (page: Page) => page.locator('.help-tile-grid > li');

test('the Help home offers a tile for each public section', async ({
  page,
}) => {
  await page.goto('/help');

  await expect(tiles(page)).toHaveCount(helpManifest.topics.length);
  for (const [index, id] of helpManifest.topics.entries()) {
    await expect(tiles(page).nth(index).getByRole('link')).toHaveAttribute(
      'href',
      `/help/topics/${id}`,
    );
  }
  await expect(
    page.locator('#help-page').getByRole('link', { name: 'Contact us' }),
  ).toBeVisible();
});

test('every guide address from before FC-048 still opens its guide', async ({
  page,
}) => {
  for (const slug of helpManifest.slugs) {
    await page.goto(`/help/${slug}`);

    await expect(page).toHaveURL(`/help/${slug}`);
    await expect(page.locator('#help-guide-page h1')).toBeVisible();
  }
});

test('the keyboard opens a section and a guide, and Back returns', async ({
  page,
}) => {
  await page.goto('/help');

  const first = tiles(page).first().getByRole('link');

  await first.focus();
  await expect(first).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(`/help/topics/${helpManifest.topics[0]}`);

  const guide = page.locator('.help-guide-list > li').first().getByRole('link');

  await guide.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#help-guide-page h1')).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(`/help/topics/${helpManifest.topics[0]}`);
  await page.goBack();
  await expect(page).toHaveURL('/help');
  await expect(tiles(page).first()).toBeVisible();
});

test('nothing scrolls sideways at 375px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });

  for (const path of [
    '/help',
    `/help/topics/${helpManifest.topics[0]}`,
    `/help/${helpManifest.slugs[0]}`,
  ]) {
    await page.goto(path);
    await expect(page.locator('h1').first()).toBeVisible();

    expect(await scrollsSideways(page), path).toBe(false);
  }
});

test('the Help home, a section and a guide are mechanically accessible', async ({
  page,
}) => {
  await page.goto('/help');
  await expect(tiles(page).first()).toBeVisible();
  await noViolations(page, '#help-page');

  await page.goto(`/help/topics/${helpManifest.topics[0]}`);
  await expect(page.locator('#help-topic-page h1')).toBeVisible();
  await noViolations(page, '#help-topic-page');

  await page.goto(`/help/${helpManifest.slugs[0]}`);
  await expect(page.locator('#help-guide-page h1')).toBeVisible();
  await noViolations(page, '#help-guide-page');
});
