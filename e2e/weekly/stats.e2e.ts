import { expect, test } from '@playwright/test';

import { MEMBER_STORAGE_STATE } from '../support/actors';
import { backend } from '../support/backend';
import { member } from '../support/member';

/**
 * STATS-01. The overview count is the member's own accounts. An unknown
 * breakdown is a page of its own, not a zero pretending to be data.
 */

test.use({ storageState: MEMBER_STORAGE_STATE });

test(
  'STATS-01 the account count, a breakdown, and an unknown breakdown',
  {
    tag: '@weekly',
  },
  async ({ page }) => {
    const shot = backend.snapshot(member.email);

    await page.goto('/dashboard/stats');
    await expect(
      page.getByRole('heading', { name: 'Statistics' }),
    ).toBeVisible();
    await expect(
      page.getByText('Accounts', { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText(String(shot.accounts.length), { exact: true }).first(),
    ).toBeVisible();

    const breakdown = page
      .getByRole('link')
      .filter({ hasText: /by /i })
      .first();
    if (await breakdown.count()) {
      await breakdown.click();
      await expect(page).toHaveURL(/\/dashboard\/stats\//);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    }

    await page.goto('/dashboard/stats/not-a-real-breakdown');
    await expect(
      page.getByRole('heading', { name: 'Unknown Stat' }),
    ).toBeVisible();
  },
);
