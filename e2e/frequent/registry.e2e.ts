import { expect, test } from '@playwright/test';

import { backend } from '../support/backend';
import { member } from '../support/member';
import { accountBySlug } from '../support/snapshot';

/**
 * REG-01. Search finds a public member and the trail from profile to account
 * to captain. A private member is not in the results.
 *
 * Actors: anonymous. The profiles are the seeded demonstration set.
 */

test(
  'REG-01 search reaches a public captain and omits a private member',
  { tag: '@high' },
  async ({ page }) => {
    const shot = backend.snapshot(member.email);
    const account = accountBySlug(shot, member.publicAccount);
    const captain = account.characters.find(
      character => character.publiclyVisible,
    );

    if (!captain) {
      throw new Error(
        'The public demonstration account has no public captain.',
      );
    }

    await page.goto('/community/registry/search');
    await page.getByLabel('Username').fill(member.username);
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await page.getByRole('link', { name: member.username }).click();

    await expect(
      page.getByRole('heading', { name: member.username, exact: true }),
    ).toBeVisible();
    await page.getByText(account.handle, { exact: true }).click();
    await expect(
      page.getByRole('heading', { name: `@${account.handle}` }),
    ).toBeVisible();
    await page.getByText(captain.handle, { exact: true }).click();
    await expect(
      page.getByRole('heading', { name: captain.handle, exact: true }),
    ).toBeVisible();

    await page.goto('/community/registry/search');
    await page.getByLabel('Username').fill(shot.privateUsername);
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(
      page.getByText('No officers match that search.'),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: shot.privateUsername, exact: true }),
    ).toHaveCount(0);
  },
);
