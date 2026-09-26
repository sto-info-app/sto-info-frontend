import { expect, test } from '@playwright/test';

import { backend } from '../support/backend';

/**
 * STORY-02, the switched-off half.
 *
 * Actors: anonymous. The feature is switched off here, before the project
 * that switches it on. The page is polled because the running server reuses
 * a setting for a few seconds.
 */

test(
  'STORY-02 Storytime switched off is the unavailable page',
  { tag: '@high' },
  async ({ page }) => {
    backend.storytimeOff();

    await expect(async () => {
      await page.goto('/storytime');
      await expect(page).toHaveURL(/\/storytime\/unavailable/);
      await expect(
        page.getByRole('heading', { name: 'STO Storytime' }),
      ).toBeVisible();
      await expect(page.getByText('Currently Offline')).toBeVisible();
    }).toPass({ timeout: 25_000 });
  },
);
