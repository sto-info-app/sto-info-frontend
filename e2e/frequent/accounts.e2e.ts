import { expect, test } from '@playwright/test';

import { MEMBER_STORAGE_STATE } from '../support/actors';
import { backend } from '../support/backend';
import {
  choosePlatformAndLauncher,
  fillCharacterMetadata,
} from '../support/forms';
import { member } from '../support/member';
import { accountBySlug, accountShape } from '../support/snapshot';

/**
 * ACC-01 and CHAR-01.
 *
 * Actors: the demonstration member. Metadata comes from the live selects.
 * The accounts created here are removed afterwards. The demonstration
 * member's other account is compared from a snapshot, not by opening it.
 */

test.use({ storageState: MEMBER_STORAGE_STATE });

test(
  'ACC-01 creating an account, editing its notes, and leaving another account alone',
  { tag: '@high' },
  async ({ page }) => {
    const handle = `ea${Date.now().toString(36).slice(-6)}`;
    const notes = `Notes for ${handle} only.`;
    const before = backend.snapshot(member.email);
    const other = accountShape(accountBySlug(before, member.privateAccount));

    try {
      await page.goto('/dashboard/accounts/add');
      await expect(
        page.getByRole('heading', { name: 'Add STO Account' }),
      ).toBeVisible();
      await page.getByLabel('Handle').fill(handle);
      const chosen = await choosePlatformAndLauncher(page);
      await page.getByRole('button', { name: 'Create', exact: true }).click();

      await expect(page).toHaveURL(
        new RegExp(`/dashboard/accounts/${handle}$`),
      );
      await expect(
        page.getByRole('heading', { name: `Account: ${handle}` }),
      ).toBeVisible();

      await page.goto(`/dashboard/accounts/${handle}/edit`);
      await expect(
        page.getByRole('heading', { name: 'Edit STO Account' }),
      ).toBeVisible();
      await expect(
        page.getByLabel('Platform', { exact: true }).locator('option:checked'),
      ).toHaveText(chosen.platform);
      await expect(
        page.getByLabel('Launcher (Optional)').locator('option:checked'),
      ).toHaveText(chosen.launcher);

      await page.getByLabel('Notes').fill(notes);
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(
        page.getByRole('heading', { name: `Account: ${handle}` }),
      ).toBeVisible();
      await expect(page.getByText(notes)).toBeVisible();
      await page.reload();
      await expect(page.getByText(notes)).toBeVisible();

      const after = backend.snapshot(member.email);

      expect(accountShape(accountBySlug(after, member.privateAccount))).toEqual(
        other,
      );
    } finally {
      backend.discardAccount(member.email, handle);
    }
  },
);

test(
  'CHAR-01 adding a captain, editing them, and leaving the other captain and account alone',
  { tag: '@high' },
  async ({ page }) => {
    const handle = `ec${Date.now().toString(36).slice(-6)}`;
    const letters = Date.now()
      .toString(36)
      .replace(/[0-9]/g, digit => 'abcdefghij'[Number(digit)])
      .replace(/[^a-z]/gi, '')
      .slice(-6);
    const first = `Avery${letters}`;
    const second = `Bryce${letters}`;
    const biography = `Belongs to ${first} alone.`;
    const before = backend.snapshot(member.email);
    const other = accountShape(accountBySlug(before, member.privateAccount));

    try {
      await page.goto('/dashboard/accounts/add');
      await page.getByLabel('Handle').fill(handle);
      await choosePlatformAndLauncher(page);
      await page.getByRole('button', { name: 'Create', exact: true }).click();
      await expect(page).toHaveURL(
        new RegExp(`/dashboard/accounts/${handle}$`),
      );

      const faction = await addCaptain(page, handle, first);
      await expect(
        page.getByRole('heading', { name: first, exact: true }),
      ).toBeVisible();
      await expect(page.getByText(faction, { exact: true })).toBeVisible();

      await page.goto(`/dashboard/accounts/${handle}/${first}/edit`);
      await expect(
        page.getByRole('heading', { name: 'Edit Captain' }),
      ).toBeVisible();
      await page.getByLabel('Biography').fill(biography);
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(
        page.getByRole('heading', { name: first, exact: true }),
      ).toBeVisible();
      await expect(page.getByText(biography)).toBeVisible();
      await page.reload();
      await expect(page.getByText(biography)).toBeVisible();

      await addCaptain(page, handle, second);
      await expect(
        page.getByRole('heading', { name: second, exact: true }),
      ).toBeVisible();
      await expect(page.getByText(biography)).toHaveCount(0);

      const after = backend.snapshot(member.email);

      expect(accountShape(accountBySlug(after, member.privateAccount))).toEqual(
        other,
      );
    } finally {
      backend.discardAccount(member.email, handle);
    }
  },
);

async function addCaptain(
  page: import('@playwright/test').Page,
  account: string,
  name: string,
): Promise<string> {
  await page.goto(`/dashboard/accounts/${account}/characters/add`);
  await expect(
    page.getByRole('heading', { name: 'Add Captain' }),
  ).toBeVisible();
  await page.getByLabel('Captain Name').fill(name);
  const faction = await fillCharacterMetadata(page);
  await page.getByRole('button', { name: 'Create', exact: true }).click();

  // Creating a captain returns to the account. The portrait opens the captain.
  await expect(page).toHaveURL(new RegExp(`/dashboard/accounts/${account}$`));
  await page.getByRole('img', { name, exact: true }).click();
  await expect(page).toHaveURL(
    new RegExp(`/dashboard/accounts/${account}/${name}$`),
  );

  return faction;
}
