import { expect, test } from '@playwright/test';

import { MEMBER_STORAGE_STATE } from '../support/actors';
import { backend } from '../support/backend';
import { member } from '../support/member';
import { accountBySlug } from '../support/snapshot';

/**
 * TRACK-02 and TRACK-03.
 *
 * Actors: the demonstration member. The R&D level is put back to where it
 * started. A captain whose level is unset is not level-locked.
 */

test.use({ storageState: MEMBER_STORAGE_STATE });

test(
  'TRACK-02 an R&D level survives a reload and stays inside its range',
  {
    tag: '@weekly',
  },
  async ({ page }) => {
    const shot = backend.snapshot(member.email);
    const account = accountBySlug(shot, member.publicAccount);
    const captain = account.characters[0];

    if (!captain) {
      throw new Error('The public demonstration account has no captain.');
    }

    const path = `/dashboard/accounts/${account.handle}/${captain.handle}?tab=rd`;
    await page.goto(path);
    await expect(page.getByRole('tab', { name: 'R&D' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    const slider = page.getByRole('slider').first();
    await expect(slider).toBeVisible();
    await expect(slider).toHaveAttribute('max', '20');
    await expect(slider).toHaveAttribute('min', '0');

    const started = await slider.inputValue();
    await slider.fill('1');
    await slider.dispatchEvent('change');
    await page.reload();
    await expect(page.getByRole('slider').first()).toHaveValue('1');

    const tabText = {
      Specializations: 'Points Spent',
      Admiralty: 'Tiers Earnt',
      Commendations: 'Ranks Earnt',
    } as const;

    for (const [tab, text] of Object.entries(tabText)) {
      await page.getByRole('tab', { name: tab }).click();
      await expect(page.getByRole('tab', { name: tab })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      await expect(page.getByText(text).first()).toBeVisible();
    }

    await page.goto(path);
    const restore = page.getByRole('slider').first();
    await restore.fill(started);
    await restore.dispatchEvent('change');
    await page.reload();
    await expect(page.getByRole('slider').first()).toHaveValue(started);
  },
);

test(
  'TRACK-03 endeavour filters, character tabs, and an unknown tab',
  {
    tag: '@weekly',
  },
  async ({ page }) => {
    const shot = backend.snapshot(member.email);
    const account = accountBySlug(shot, member.publicAccount);
    const captain = account.characters[0];

    if (!captain) {
      throw new Error('The public demonstration account has no captain.');
    }

    await page.goto(`/dashboard/accounts/${account.handle}/endeavours`);
    const category = page.getByLabel('Category');
    await expect
      .poll(async () => category.locator('option').count())
      .toBeGreaterThan(1);
    await category.selectOption({ index: 1 });
    await page.getByRole('button', { name: 'Clear Filters' }).click();
    await expect(category).toHaveValue('All');

    const character = `/dashboard/accounts/${account.handle}/${captain.handle}`;
    await page.goto(`${character}?tab=rd`);
    await expect(page.getByRole('tab', { name: 'R&D' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await page.getByRole('tab', { name: 'Specializations' }).click();
    await expect(page).toHaveURL(/tab=specializations/);
    await page.goBack();
    await expect(page.getByRole('tab', { name: 'R&D' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await page.goForward();
    await expect(page).toHaveURL(/tab=specializations/);

    await page.goto(`${character}?tab=not-a-tab`);
    await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  },
);
