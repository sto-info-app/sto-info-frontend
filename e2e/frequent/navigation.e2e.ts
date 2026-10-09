import { expect, test } from '@playwright/test';

import { member } from '../support/member';

/**
 * NAV-01. Home, login and the public registry, including a reload of a deep
 * link, with no uncaught exception.
 *
 * Actors: anonymous.
 */

test(
  'NAV-01 home, login and the public registry survive a reload',
  { tag: '@high' },
  async ({ page }) => {
    const errors: string[] = [];

    page.on('pageerror', error => {
      errors.push(error.message);
    });

    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /Welcome to the/ }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Login' }).first(),
    ).toBeVisible();

    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();

    await page.goto('/community/registry/search');
    await expect(
      page.getByRole('heading', { name: 'Search the Registry' }),
    ).toBeVisible();

    await page.goto(`/community/registry/profiles/${member.username}`);
    await expect(
      page.getByRole('heading', { name: member.username, exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole('heading', { name: member.username, exact: true }),
    ).toBeVisible();
    await expect(page).toHaveURL(
      new RegExp(`/community/registry/profiles/${member.username}$`),
    );

    expect(errors).toEqual([]);
  },
);
