import { expect, test } from '@playwright/test';

/**
 * STATIC-01. One pass over the public pages, including a guide that exists
 * and two addresses that do not.
 *
 * Actors: anonymous. These pages do not ask the API for their copy.
 */

const PAGES: readonly (readonly [string, RegExp])[] = [
  ['/about', /About the/],
  ['/roadmap', /^STO Info Roadmap$/],
  ['/resources', /^Star Trek Online Resources$/],
  ['/help', /^Help$/],
  ['/help/the-galactic-personnel-registry', /^What the registry is$/],
  ['/credits', /^Credits$/],
  ['/terms-of-use', /^Terms of use$/],
  ['/privacy-policy', /^Privacy Policy$/],
  ['/about/developers', /^Developers$/],
];

test(
  'STATIC-01 the public pages, and the addresses that are not pages',
  {
    tag: '@weekly',
  },
  async ({ page }) => {
    for (const [path, heading] of PAGES) {
      await page.goto(path);
      await expect(
        page.getByRole('heading', { level: 1, name: heading }),
      ).toBeVisible();
    }

    await page.goto('/help/not-a-guide');
    await expect(page).toHaveURL(/\/page-not-found/);
    await expect(
      page.getByRole('heading', { name: 'Page Not Found' }),
    ).toBeVisible();

    await page.goto('/not-a-page');
    await expect(
      page.getByRole('heading', { name: 'Page Not Found' }),
    ).toBeVisible();
  },
);
